const express = require('express');
const app = express();
const CORS = require('cors');
const BODY_PARSER = require('body-parser');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const TODODB = require('./models/index');
const PORT = 1820;
const axios = require('axios')
require('dotenv').config();


app.use(BODY_PARSER.urlencoded({ extended: true }));
app.use(express.json());
app.use(CORS({
  origin: "http://localhost:5173",
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

mongoose.connect('mongodb://localhost:27017/DatabaseAI');

app.get("/", (req, res) => {
  res.send("<H1>I am still JINDA my Bud...</H1>")
})

app.post("/askrequest", async (req, res) => {

  const client = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_CLIENT_ID);

  function AddTODO(title) {

    const todo = new TODODB({
      title: title,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    todo.save()

    return todo;

  }

  async function getAllTODO() {
    const Data = await TODODB.find();
    return Data;
  }


  const CLIENT_ID = process.env.GOOGLE_SHELL_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_SHELL_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GOOGLE_SHELL_REFRESH_TOKEN;


  async function getAccessToken() {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', null, {
        params: {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: REFRESH_TOKEN,
          grant_type: 'refresh_token'
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.access_token;

    } catch (error) {
      console.error('Error fetching access token:', error.response ? error.response.data : error.message);
    }
  }


  async function FetchAllEmails() {

    const Access_Token = await getAccessToken();

    const Allmails = await axios.get("https://gmail.googleapis.com/gmail/v1/users/me/messages", {
      headers: {
        Authorization: `Bearer ${Access_Token}`
      },
      params: {
        q: "category:primary",
      }
    });

    const emailPromises = Allmails.data.messages.slice(0,5).map(async (message) => {
      const particularEmail = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${Access_Token}` }
      });

      const headers = particularEmail.data.payload.headers;
      return {
        FROM: headers.find((h) => h.name === "From")?.value || "Unknown Sender",
        Date: headers.find((h) => h.name === "Date")?.value || "Unknown Date",
        Subject: headers.find((h) => h.name === "Subject")?.value || "No Subject",
        peekText: particularEmail.data.snippet
      };
    });

    const AllEmails_Object = await Promise.all(emailPromises);
    return AllEmails_Object;
  }

  const tools = {
    AddTODO: AddTODO,
    getAllTODO: getAllTODO,
    FetchAllEmails: FetchAllEmails
  }

  const SYSTEM_PROMPT = `
    
    Your name is Falio . You are an TO-DO-LIST manager . You can perform some tasks such as You can manage TO-DO List of user .  
    
    Your To-Do list Manager workflow is described below: 
    You can manage your to-do list by adding, deleting, and updating tasks. You must strictly follow the JSON output format.You are AI assistant with START , PLAN , ACTION , Obsevation  and Output State . Wait for  the user prompt and first PLAN using available tools . After Planning , take ACTION with apporriate tools and wait for the observation based on Action . Once ypu get observations , Returns the AI output based on START prompt and observations.

    Todo DB Schema : 
    title: {
        type: String
    }
    createdAt: {
        type: Date,
        default: Date.now   
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

    Available tools :
    AddTODO(title) : Add a new todo item and returns the added todo item.
    getAllTODO() : returns all the todo items.

    Example 1:
    START
    {"type":"user","user":"Add a task for shopping"}

    {"type":"plan","plan":"I will try to get more context on what the user wants to shop for"}

    {"type":"output","output":"What do you want to shop for?"}

    {"type":"user","user":"I want to shop for Grocries"}

    {"type":"plan","plan":"I will use AddTODO function to add a new todo in DB"}

    {"type":"action","function":"AddTODO","input":"Shopping and Buy Groceries"}

    {"type":"plan","plan":"I will wait for the observation from the AddTODO function"}

    {"type":"observation","observation":"Data has been Added: Shopping and Buy Groceries"}

    {"type":"output","output":"New item has been added in to do list"}


    Example 2:
    START
    {"type":"user","user":"I want to see my to do list"}

    {"type":"plan","plan":"I will use getAllTODO function to get all the todo items"}

    {"type":"action","function":"getAllTODO","input":""}

    {"type":"plan","plan":"I will wait untill I get observation from the getAllTODO function"}

    {"type":"observation","observation":"[{
  "_id": {
    "$oid": "67b0b1814b86b6c852fe9d69"
  },
  "title": "Play Asphalt 8: Airborne",
  "createdAt": {
    "$date": "2025-02-15T15:23:45.174Z"
  },
  "updatedAt": {
    "$date": "2025-02-15T15:23:45.174Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "67b0b5a069749b07a94e8101"
  },
  "title": "listening music",
  "createdAt": {
    "$date": "2025-02-15T15:41:20.013Z"
  },
  "updatedAt": {
    "$date": "2025-02-15T15:41:20.013Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "67b0b5a069749b07a94e8101"
  },
  "title": "Shopping and Buy Groceries",
  "createdAt": {
    "$date": "2025-02-15T15:41:20.013Z"
  },
  "updatedAt": {
    "$date": "2025-02-15T15:41:20.013Z"
  },
  "__v": 0
},
]"}

   {"type":"output","output":"Your to do list is :
   - Play Asphalt 8: Airborne
   - listening Music
   - Shopping and Buy Groceries received from observation"
   }

  Alongside of TO-DO List Manager you are Gmail assistant which assists user for managing its Gmail related things.

   Your Gmail Manager workflow is described below: 
   You can manage your users Gmail by feteching Users gmails. You must strictly follow the JSON output format.You are Gmail assistant with START , PLAN , ACTION , Obsevation  and Output State . Wait for  the user prompt and first PLAN using available tools . After Planning , take ACTION with apporriate tools and wait for the observation based on Action . Once you get observations , Returns the AI output based on START prompt and observations.

   For Working with Gmail related tasks you can prefer below Available tools

   Available tools for Gmail :
  - FetchAllEmails() : Fetches latest Emails of the user

  Example 1:
  START
  {"type":"user","user":"Fetch my latest Emails from my Inboxes"}

  {"type":"plan","plan":"I will try to fetch Emails from user inbox using available tools"}

  {"type":"plan","plan":"I will call FetchAllEmails() function from available tools"}

  {"type":"action","function":"FetchAllEmails","input":""}

  {"type":"plan","plan":"I will wait for the observation from the FetchAllEmails function"}

  {"type":"observation","observation":[

  {
  FROM: 'Coding Ninjas <mailer@certifications.codingninjas.com>',
  Date: 'Wed, 05 Mar 2025 07:39:12 +0000',
  Subject: 'Update: Confirm your spot for E&ICT, IIT Guwahati data analytics certification program',  
  peekText: 'Click to know more Follow us: YouTube LinkedIn Instagram Facebook You&#39;re receiving this email because you signed up with https://www.codingninjas.com/ Question? Contact contact@codingninjas.com or'
},

{
  FROM: 'LMU Graduate Admission <graduateadmission@lmu.edu>',
  Date: 'Wed, 05 Mar 2025 20:04:42 +0000 (UTC)',
  Subject: 'Important Reminder: RSVP for Grad Open House Week',
  peekText: 'LMU Graduate Admission Dear Aditya, Our faculty and staff are eagerly making final preparations for our Graduate Programs Open House Week, taking place Tuesday, March 18 through Friday, March 21. You'
}
  
]}

  {"type":"plan","plan":"I will retrive observation data and summarize it to the user"}

  {"type":"output","output":"
  You have 2 emails from the Coding Ninjas and LMU Graduate Admission bot has subject as 
  Update: Confirm your spot for E&ICT, IIT Guwahati data analytics certification program and 
  Important Reminder: RSVP for Grad Open House Week respectively
  "}
   
    `

  const model = client.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM_PROMPT });

  function extractJsonObjects(input) {
    const cleaned = input.replace(/```json|```/g, '').trim();
    const jsonMatches = cleaned.match(/\{(?:[^{}]|{[^{}]*})*\}/g);
    if (!jsonMatches) return [];
    return jsonMatches.map(json => {
      try {
        return JSON.parse(json);
      } catch (error) {
        console.error("Error parsing JSON:", error, json);
        return null;
      }
    }).filter(obj => obj !== null);

  }

  const chat = model.startChat({ history: [] });

  const answer = await chat.sendMessage(req.body.message);
  const FinalResponse = extractJsonObjects(answer.response.text());

  for (const answer of FinalResponse) {
    if (answer.type === "output") {
      return res.json({ "answer": answer.output })
    }

    if (answer.type === "action") {
      const tool = tools[answer.function];
      if (!tool) {
        console.error("Tool not found: ", answer.function);
        break;
      }
      const observation = await tool(answer.input);

      const response = {
        type: "observation",
        observation: observation
      };
      
      const newAnswer = await chat.sendMessage(JSON.stringify(response))
      const newFinalResponse = extractJsonObjects(newAnswer.response.text())
      for (ans of newFinalResponse) {
        if (ans.type === "output") {
          return res.json({ "answer": ans.output })
        }
      }
    }
  }

})

app.listen(PORT, () => {
  console.log(`App is Running on PORT : ${PORT}`);
})