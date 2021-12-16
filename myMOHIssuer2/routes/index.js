const express = require('express');
const router = express.Router();
const { CredentialsServiceClient , Credentials } = require("@trinsic/service-clients");
const cache = require('../model');
require('dotenv').config();

const client = new CredentialsServiceClient(
    new Credentials(process.env.ACCESSTOK),
    { noRetryPolicy: true });

const clientMlg = new CredentialsServiceClient(
    new Credentials(process.env.ACCESSTOKMLG),
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
      const attribs = cache.get(req.body.object_id)
      if (attribs) {
        console.log("attribs ok");
        let param_obj = JSON.parse(attribs);
        let params = {
          definitionId: process.env.CRED_DEF_ID_MLG,
          connectionId: req.body.object_id,
          automaticIssuance: true,
          credentialValues: {
            "ID": param_obj["theID"],
            "Coursename": param_obj["theCourseName"],
            "Issuer": param_obj["theIssuer"],
            "Issued": param_obj["theIssued"],
            "Valid": param_obj["theValid"]
          }
        }
        console.log(param_obj)
        console.log(params)
        await clientMlg.createCredential(params);
      }
    }
  }
  catch (e) {
    console.log(e.message || e.toString());
  }
});

module.exports = router;
