import express, {json} from "express";
import chalk from "chalk";
import cors from "cors";
import Joi from "joi";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const app = express();
app.use(json());
app.use(cors());

const PORTA = 5000;

dotenv.config();

//Pensando nas variáveis de forma local

const participants = [];

// Conectando no banco de dados
const mongoClient = new MongoClient(process.env.MONGO_URI);

//post participants
app.post("/participants", async (req, res) => {
    // name pelo body da request
    //console.log(schema.validate(req.body)); --. { value: { name: 'teste' } }
    
    try {
        await mongoClient.connect();
        const dbBatePapo = mongoClient.db("batepapouol")
        const usersCollection = dbBatePapo.collection("participants");

            // Validação Joi
        const schema = Joi.object({
            name: Joi.string()
            .required(),
        })

		const { error, value } = schema.validate(req.body);
        
        if(error){
            res.sendStatus(422);
            //mongoClient.close();
            return;
        } else if(await usersCollection.findOne({name: value.name})){
            res.sendStatus(409);
            //mongoClient.close();
            return;
        }

        const infosParticipant = {
            name: value.name,
            lastStatys: Date.now()
        };
        const message = ({from:value.name,
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time:`${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
        });

        const userOn = await usersCollection.insertOne(infosParticipant);
        const messageEnter = dbBatePapo.collection("messageEnter");
        const insertMessageEnter = messageEnter.insertOne(message);
        res.sendStatus(201);
        //mongoClient.close();
    } catch(e){
        console.log(chalk.bold.red("Erro ao entrar na sala"), e);
    }
})

// get participantes -- Retornar a lista de todos os participantes
app.get("/participants", (req, res) =>{
    res.send(participants)
});

// post messages
app.post("/messages", (req, res) =>{
    // Validação Joi
    const schema = Joi.object({
        to: Joi.string()
        .required(),

        text: Joi.string()
        .required(),

        type: Joi.any()
        .valid('message', 'private_message')
        .required()
    })

    const { error, value } = schema.validate(req.body);
    const { user } = req.headers;
})

// subindo back-end
app.listen(PORTA, () => {
    console.log(chalk.bold.green(`Back-end on na porta ${PORTA}`))
})