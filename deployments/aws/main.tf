provider "aws" {
  region = "us-east-1"
}

variable "aws_ami" {
  default = "ami-007855ac798b5175e"
}

variable "key_name" {
  default = "aws-dev-001"
}

variable "private_key_path" {
  default = "/Users/tejprtap/Downloads/aws-dev-001.pem"
}


data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

locals {
  cluster_name = "learnk8s"
}

data "aws_eks_cluster" "cluster" {
  name = module.eks.cluster_name
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority.0.data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}

module "eks-kubeconfig" {
  source  = "hyperbadger/eks-kubeconfig/aws"
  version = "2.0.0"

  depends_on   = [module.eks]
  cluster_name = module.eks.cluster_name
}

resource "local_file" "kubeconfig" {
  content  = module.eks-kubeconfig.kubeconfig
  filename = "kubeconfig_${local.cluster_name}"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "2.77.0"

  name                 = "vpc"
  cidr                 = "10.0.0.0/16"
  azs                  = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets      = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets       = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true

  public_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                      = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb"             = "1"
  }
}


resource "aws_security_group" "redis_sg" {
  name   = "redis_sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }
}


resource "aws_instance" "redis" {
  count = 4

  ami                    = var.aws_ami
  instance_type          = "t2.micro"
  subnet_id              = tolist(module.vpc.private_subnets)[0]
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.redis_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update
              sudo apt-get install redis-server -y
              sudo sed -i "s/supervised no/supervised systemd/g" /etc/redis/redis.conf
              sudo systemctl restart redis.service
              EOF

  tags = {
    Name = "Redis-${count.index}"
  }
}


resource "aws_security_group" "bastion_sg" {
  name   = "bastion_sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_eip" "bation_ip" {
  vpc = true
}

resource "aws_instance" "bastion" {
  ami                         = var.aws_ami
  instance_type               = "t2.micro"
  subnet_id                   = tolist(module.vpc.public_subnets)[0]
  key_name                    = var.key_name
  vpc_security_group_ids      = [aws_security_group.bastion_sg.id]
  associate_public_ip_address = aws_eip.bation_ip.address
  user_data                   = <<-EOF
              #!/bin/bash
              sudo apt-get update
              sudo apt-get install redis-tools -y
              sudo apt-get install default-jdk -y
              wget "https://downloads.apache.org/kafka/2.8.0/kafka_2.13-2.8.0.tgz"
              tar -xzf kafka_2.13-2.8.0.tgz
              EOF

  tags = {
    Name = "Bastion"
  }
}

output "bation_public_ip" {
  value = aws_eip.bation_ip.public_ip
}

resource "aws_security_group" "kafka_sg" {
  name   = "kafka_sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 9092
    to_port     = 9092
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "kafka" {
  count                  = 3
  ami                    = var.aws_ami
  instance_type          = "t2.micro"
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.kafka_sg.id]
  subnet_id              = tolist(module.vpc.private_subnets)[1]

  tags = {
    Name = "kafka-${count.index}"
  }

  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update
              sudo ap-get upgrade -y
              EOF


  provisioner "local-exec" {
    command = "ansible-playbook -T 300 ansible/playbooks/setup-kafka.yml"
  }
}

output "aws_instance_kafka_0" {
  value = aws_instance.kafka[0].public_ip
}
output "aws_instance_kafka_1" {
  value = aws_instance.kafka[1].public_ip
}
output "aws_instance_kafka_2" {
  value = aws_instance.kafka[2].public_ip
}





module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  version         = "19.14.0"
  cluster_name    = local.cluster_name
  subnet_ids      = module.vpc.private_subnets
  vpc_id          = module.vpc.vpc_id
  cluster_version = "1.24"

  eks_managed_node_groups = {
    first = {
      desired_capacity = 1
      max_capacity     = 10
      min_capacity     = 1

      instance_type = "t2.micro"
      additional_security_group_ids = [aws_security_group.worker_nodes.id]
    }
  }
}


resource "aws_security_group" "worker_nodes" {
  name        = "worker_nodes"
  description = "Security group for all nodes in the cluster"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}



resource "aws_instance" "pritunl" {
  ami           = var.aws_ami
  instance_type = "t2.micro"
  key_name      = var.key_name
  subnet_id     = tolist(module.vpc.public_subnets)[1]

  tags = {
    Name = "pritunl ec2"
  }

  provisioner "file" {
    source      = "pritunl_setup.sh"
    destination = "/tmp/pritunl_setup.sh"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/pritunl_setup.sh",
      "/tmp/pritunl_setup.sh",
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.private_key_path)
      host        = self.public_ip
    }
  }


  user_data = <<-EOF
              #!/bin/bash
              sudo systemctl start pritunl mongodb
              sudo systemctl enable pritunl mongodb
              EOF

  vpc_security_group_ids = [aws_security_group.pritunl_sg.id]
}

resource "aws_security_group" "pritunl_sg" {
  name        = "pritunl_sg"
  description = "Allow incoming connections to Pritunl"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Pritunl"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 1194
    to_port     = 1194
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


output "pritunl_public_ip" {
  value = aws_instance.pritunl.public_ip
}