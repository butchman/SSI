const express = require('express');
const router = express.Router();
const { CredentialsServiceClient , Credentials } = require("@trinsic/service-clients");
const cache = require('../model');
require('dotenv').config();

const client = new CredentialsServiceClient(
    new Credentials(process.env.ACCESSTOK),
    { noRetryPolicy: true });

/* GET home page */
router.get('/', function(req, res, next) {
  res.render('index');
});

/* Webhook endpoint */
router.post('/webhook', async function (req, res) {
  try {
    console.log("got webhook" + req + "   type: " + req.body.message_type);
    if (req.body.message_type === 'new_connection') {
      console.log("new connection notification");
      const attribs = cache.get(req.body.object_id);
      console.log(attribs);
      if (attribs) {
        console.log("attribs ok");
        let param_obj = JSON.parse(attribs);
        let params = {
          definitionId: process.env.CRED_DEF_ID,
          connectionId: req.body.object_id,
          automaticIssuance: true,
          credentialValues: {
            "ID": param_obj["ID"],
            "IDtype": param_obj["IDtype"],
            "Name": param_obj["Name"],
            "Address": param_obj["Address"],
            "City": param_obj["City"],
            "DOB": param_obj["DOB"],
            "Issued": param_obj["Issued"],
            "Valid": param_obj["Valid"]
          }
        }
        console.log(param_obj)
        console.log(params)
        await client.createCredential(params);
      }
    }
  }
  catch (e) {
    console.log(e.message || e.toString());
  }
});

module.exports = router;
