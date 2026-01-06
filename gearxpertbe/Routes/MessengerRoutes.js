const express = require('express');
const routerMessage = express.Router();
const { NewConversation, GetConversation,SendMessage, GetMessages, MarkMessagesAsSeen, getUserByUserId } = require('../controllers/Message/MessageController');
const { checkAccessToken } = require('../middleware/JWTAction');


routerMessage.get('/user/:userId',checkAccessToken,getUserByUserId)
routerMessage.post('/conversation',checkAccessToken,NewConversation);
routerMessage.get('/conversation',checkAccessToken,GetConversation);
routerMessage.post('/message',checkAccessToken,SendMessage);
routerMessage.get('/messages/:conversationId',checkAccessToken,GetMessages);
routerMessage.put('/seenmessage/:conversationId',checkAccessToken,MarkMessagesAsSeen);

module.exports = routerMessage;