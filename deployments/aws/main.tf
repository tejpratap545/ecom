provider "aws" {
  region = "us-east-1"
}

variable "aws_ami" {
  default = "ami-0dba2cb6798deb6d8"
}

variable "key_name" {
  default = "aws-dev-001"
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




resource "aws_instance" "bastion" {
  ami                    = var.aws_ami
  instance_type          = "t2.micro"
  subnet_id              = tolist(module.vpc.public_subnets)[0]
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.bastion_sg.id]

  user_data = <<-EOF
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
  subnet_id              = tolist(module.vpc.public_subnets)[1]

  tags = {
    Name = "kafka-${count.index}"
  }

  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update
              sudo ap-get upgrade -y
              EOF
 
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



