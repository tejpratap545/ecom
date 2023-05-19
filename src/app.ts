import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import router from './routes';

dotenv.config();


const app: Express = express();
app.use(express.json());
const port = process.env.PORT || 8001;
app.use(router)
app.get('/ping', (req: Request, res: Response) => {
  res.send('pong');
});


app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});