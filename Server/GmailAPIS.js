const axios = require('axios');
require('dotenv').config();

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

const makeGmailApiRequest = async () => {

    const Access_Token = await getAccessToken();

    console.log(Access_Token);

    const Allmails = await axios.get("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=category:primary", {
        headers: {
            Authorization: `Bearer ${Access_Token}`
        }
    })

    const emailPromises = Allmails.data.messages.slice(0,10).map(async (message) => {
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

async function main() {
   const Arrayp=await makeGmailApiRequest();
   console.log(Arrayp)
}

main()