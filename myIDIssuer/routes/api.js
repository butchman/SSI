const express = require('express');
const router = express.Router();
const cors = require('cors');
const { CredentialsServiceClient, Credentials } = require("@trinsic/service-clients");
const cache = require('../model');
require('dotenv').config();

const client = new CredentialsServiceClient(
    new Credentials(process.env.ACCESSTOK),
    { noRetryPolicy: true });

const getInvite = async () => {
  try {
    return await client.createConnection({});
  } catch (e) {
    console.log(e.message || e.toString());
  }
}

router.post('/issue', cors(), async function (req, res) {
  let params = {
    definitionId: process.env.CRED_DEF_ID,
    automaticIssuance: true,
    credentialValues: {
      "ID": req.body.theID,
      "IDtype": req.body.theIDtype,
      "Name": req.body.theName,
      "Address": req.body.theAddress,
      "City": req.body.theCity,
      "DOB": req.body.theDOB,
      "Issued": req.body.theIssued,
      "Valid": req.body.theValid,
    }
  }
  let result = await client.createCredential(params);

  res.status(200).send({ offerData: result.offerData, offerUrl: result.offerUrl });
});

router.post('/myissue', cors(), async function (req, res) {
  console.log('api.js - myissue - #1')
  const invite = await getInvite();
  const attribs = JSON.stringify(req.body);

  console.log('api.js - myissue #2')

  cache.add(invite.connectionId, attribs);
  res.status(200).send({ invitation: invite.invitationUrl });
});

router.post('/verify', cors(), async function (req, res) {
  let verification = await client.createVerificationFromPolicy(process.env.POLICY_ID);

  res.status(200).send({
    verificationRequestData: verification.verificationRequestData,
    verificationRequestUrl: verification.verificationRequestUrl,
    verificationId: verification.verificationId
  });
});

router.get('/checkVerification', cors(), async function (req, res) {
  let verificationId = req.query.verificationId;
  let verification = await client.getVerification(verificationId);

  console.log('api.js - checkVerification - 1')
  //console.log(verification)

  res.status(200).send({
    verification: verification
  });
});

module.exports = router;
