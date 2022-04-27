import express, {json} from "express";
import chalk from "chalk";
import cors from "cors";
import Joi from "joi";
import dayjs from "dayjs";
import res, { get } from "express/lib/response";

const app = express();
app.use(json());
app.use(cors());

const PORTA = 5000;

//Pensando nas variáveis de forma local

const participants = [];
const message = [];

//post participants
app.post("/participants", (req, res) => {
    // name pelo body da request
    //console.log(schema.validate(req.body)); --. { value: { name: 'teste' } }
    // Validação Joi
    const schema = Joi.object({
        name: Joi.string()
        .required(),
    })
    
    const { error, value } = schema.validate(req.body);
    if(error){
        res.sendStatus(422);
        return;
    }
    const infosParticipant = {
        name: value.name,
        lastStatys: Date.now()
    };
    message.push({from:value.name,
        to: 'Todos', 
        text: 'entra na sala...', 
        type: 'status', 
        time:`${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
    });

    participants.push(infosParticipant)
    res.sendStatus(201);
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