import express, {json} from "express";
import chalk from "chalk";
import cors from "cors";
import Joi from "joi";

const app = express();
app.use(json());
app.use(cors());

const PORTA = 5000;
const participants = [];
// Validação do Joi

const schema = Joi.object({
    name: Joi.string()
    .required()
})

//post participants
app.post("/participants", (req, res) => {
    // name pelo body da request
    //console.log(schema.validate(req.body)); --. { value: { name: 'teste' } }
    const { error, value } = schema.validate(req.body);
    if(error){
        res.sendStatus(422);
        return;
    }
    const infosParticipant = {
        name: value,
        lastStatys: Date.now()
    };
    participants.push(infosParticipant)
    res.status(200).send(participants);
})


// subindo back-end
app.listen(PORTA, () => {
    console.log(`Back-end on na porta ${PORTA}`)
})