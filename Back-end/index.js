import express, {json} from "express";
import chalk from "chalk";
import cors from "cors";
import Joi from "joi";
import dayjs from "dayjs";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { stripHtml } from "string-strip-html";

const app = express();
app.use(json());
app.use(cors());

const PORTA = 5000;

dotenv.config();

// Conectando no banco de dados
let dbBatePapo = null;
const mongoClient = new MongoClient(process.env.MONGO_URI);
const promise = mongoClient.connect();
promise.then (() => {
    dbBatePapo = mongoClient.db("batepapouol");
});
promise.catch(e => console.log(chalk.bold.red("Erro ao se conectar ao banco de dados"), e));

//post participants
app.post("/participants", async (req, res) => {
    // name pelo body da request
    //console.log(schema.validate(req.body)); --. { value: { name: 'teste' } }
        // Validação Joi
        const schema = Joi.object({
            name: Joi.string()
            .required(),
        })

		const { error, value } = schema.validate(req.body, {abortEarly: false});
        
        if(error){
            res.status(422).send(error.details.map(detail => detail.message));
            //mongoClient.close();
            return;
        }
    
    try {
        //await mongoClient.connect();
        //const dbBatePapo = mongoClient.db("batepapouol")
        const usersCollection = dbBatePapo.collection("participants");
        let nameSanitizado = stripHtml(value.name).result.trim();
        const isThereUser = await usersCollection.findOne({name: nameSanitizado})
        if(isThereUser){
            res.sendStatus(409);
            //mongoClient.close();
            return;
        }

        const infosParticipant = {
            name: nameSanitizado,
            lastStatus: Date.now()
        };
        const message = ({from:value.name,
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time:`${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
        });

        await usersCollection.insertOne(infosParticipant);
        const messageEnter = dbBatePapo.collection("messages");
        await messageEnter.insertOne(message);
        res.sendStatus(201);
        //mongoClient.close();
    } catch(e){
        res.status(500).send(console.log(chalk.bold.red("Erro ao entrar na sala"), e));
    }
})

// get participantes -- Retornar a lista de todos os participantes
app.get("/participants", async (req, res) =>{

    try{
        //await mongoClient.connect();
        //const dbBatePapo = mongoClient.db("batepapouol")
        const usersCollection = dbBatePapo.collection("participants");
        const participants = await usersCollection.find().toArray();
        res.send(participants)
    } catch(e){
        res.status(500).send(console.log(chalk.bold.red("Erro ao retornar lista de participantes"), e));
    }
});

// post messages
app.post("/messages", async (req, res) =>{
            
        // Validação Joi
        const schema = Joi.object({
            to: Joi.string()
            .required(),

            text: Joi.string()
            .required(),

            type: Joi.any()
            .valid('message', 'private_message')
            .required()
        });

        const { error, value } = schema.validate(req.body, {abortEarly: false});

        if(error){
            res.status(422).send(error.details.map(detail => detail.message));
            return;
            //mongoClient.close();
        }

    try {
        //await mongoClient.connect();
        //const dbBatePapo = mongoClient.db("batepapouol")
        const messagesCollection = dbBatePapo.collection("messages");
        const { user } = req.headers;
        const participantsCollection = dbBatePapo.collection("participants");
        const isUserValid = await participantsCollection.findOne({name: user});

        if(!isUserValid){
            res.status(422).send(console.log(chalk.bold.red("Usuário inválido")));
            return;
        }

        const message = ({
            from: user,
            to: value.to, 
            text: stripHtml(value.text).result.trim(), 
            type: value.type, 
            time:`${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
        });

        await messagesCollection.insertOne(message);
        res.sendStatus(201);
        //mongoClient.close();

    } catch(e){
        res.status(500).send(console.log(chalk.bold.red("Erro ao enviar mensagem"), e));
        //mongoClient.close();
    }
})

// get - messages -- Retornar as mensagens
app.get("/messages", async (req, res) => {

    try {

        //await mongoClient.connect();
        //const dbBatePapo = mongoClient.db("batepapouol")
        const messagesCollection = dbBatePapo.collection("messages");
        const  limit  = parseInt(req.query.limit);
        const { user } = req.headers;
        // mensagens || do tipo status || do tipo message & mensagem do tipo private_message || de: user || para: user
        const messages = await messagesCollection.find({
            $or: [
                {type: "status"},
                {type: "message"},
                {$and: [
                    {type: "private_message"},
                        {
                            $or: [
                                {from: user},
                                {to:user}
                            ]
                        }
                    ]}
            ]
        }).toArray();

        if(limit){
            res.send(messages.slice(-limit));
            //mongoClient.close();
            return;
        } 
        res.send(messages);
        
    } catch(e) {
        res.status(500).send(console.log(chalk.bold.red("Erro ao receber mensagem"), e));
        //mongoClient.close();
    }
})

// post - status
app.post("/status", async (req,res) =>{

    try {

        const { user } = req.headers;
        //await mongoClient.connect();
        //const dbBatePapo = mongoClient.db("batepapouol")
        const participantsCollection = dbBatePapo.collection("participants");
        // findOne tava dando erro com o .toArray()
        const checkStatus = await participantsCollection.findOne({name: user});

        if(!checkStatus){
            res.sendStatus(404);
            //mongoClient.close();
            return;
        }
        await participantsCollection.updateOne({name: user}, {$set: {lastStatus: Date.now()}});
        res.sendStatus(200);

    }  catch(e) {
        res.status(500).send(console.log(chalk.bold.red("Erro ao atualizar status"), e));
        //mongoClient.close();
    }
})

// delete user message
app.delete("/messages/:id", async (req, res) => {

    try {

        //await mongoClient.connect();
        //const dbBatePapo = mongoClient.db("batepapouol")
        const messagesCollection = dbBatePapo.collection("messages");
        const { user } = req.headers;
        const { id } = req.params;
        const messageExist = await messagesCollection.findOne({_id: new ObjectId(id)});
        const ownerMessage = await messagesCollection.findOne({$and:[{from: user}, {_id: new ObjectId(id)}]});
        
        if(!messageExist){
            res.sendStatus(404);
            return;
        } 

        if(!ownerMessage){
            res.sendStatus(401);
            return;
        }

        await messagesCollection.deleteOne({_id: new ObjectId(id)});
        res.sendStatus(202);
        

    } catch(e) {
        res.status(500).send(console.log(chalk.bold.red("Erro ao deletar mensagem"), e));
        //mongoClient.close();
    }
})

// Put - atualização de mensagem
app.put("/messages/:id", async (req, res) => {

        // Validação Joi
        const schema = Joi.object({
            to: Joi.string()
            .required(),

            text: Joi.string()
            .required(),

            type: Joi.any()
            .valid('message', 'private_message')
            .required()
        });

        const { error, value } = schema.validate(req.body, {abortEarly: false});
        
        if(error){
            res.status(422).send(error.details.map(detail => detail.message));
            return;
        }

    try {

        //await mongoClient.connect();
        //const dbBatePapo = mongoClient.db("batepapouol")
        const messagesCollection = dbBatePapo.collection("messages");
        const participantsCollection = dbBatePapo.collection("participants");
        const { id } = req.params;
        const { user } = req.headers;
        //console.log(user)

        const participantExist = await participantsCollection.findOne({name: user});

        if(!participantExist){
            res.sendStatus(422);
            console.log("erro no participantes inexistente")
            return;
        }

        const messageExist = await messagesCollection.findOne({_id: new ObjectId(id)});
        const ownerMessage = await messagesCollection.findOne({$and:[{from: user}, {_id: new ObjectId(id)}]});
        
        if(!messageExist){
            res.sendStatus(404);
            console.log("Erro! Mensagem inexistente")
            return;
        } 

        if(!ownerMessage){
            res.sendStatus(401);
            console.log("Erro! Participante não é o dono da mensagem")
            return;
        }

        await messagesCollection.updateOne({_id: new ObjectId(id)}, {$set: {to: value.to, text: stripHtml(value.text).result.trim(), type: value.type}});
        res.sendStatus(202);
        

    } catch(e) {
        res.status(500).send(console.log(chalk.bold.red("Erro ao atualizar mensagem"), e));
        //mongoClient.close();
    }
})

//Remoção automática de usuários inativos
setInterval(async () => {
    
    try{
        const time = Date.now();
        const statusRemove = time - 10000;

        //await mongoClient.connect();
        //const dbBatePapo = mongoClient.db("batepapouol")
        const participantsCollection = dbBatePapo.collection("participants");
        const messagesCollection = dbBatePapo.collection("messages");
        //$lt --> menor que
        const removeParticipants = await participantsCollection.find({lastStatus: {$lte:statusRemove}}).toArray();

        if(removeParticipants){
            const participantsDeleted = await participantsCollection.deleteMany({lastStatus: {$lte:statusRemove}});
            // tem que colocar async em toda chamada com await
            removeParticipants.map(async removedParticipant => {
                let message = ({from: removedParticipant.name, 
                                to: 'Todos', 
                                text: 'sai da sala...',     
                                type: 'status', 
                                time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`});
                
                await messagesCollection.insertOne(message);
            });
        }

    } catch(e) {
        res.status(500).send(console.log(chalk.bold.red("Erro na remoção automática de usuário inativo"), e));
        //mongoClient.close();
    }
}, 150000);

// subindo back-end
app.listen(PORTA, () => {
    console.log(chalk.bold.green(`Back-end on na porta ${PORTA}`))
});