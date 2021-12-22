async function issueBankAccountCertif(anSTR1) {

  var userdata = decodeURIComponent(urlParams)

  var data_arr = userdata.split("&");
  var userid = data_arr[0].split("=");
  var username = data_arr[1].split("=");
  var useraddress = data_arr[2].split("=");
  var usercity = data_arr[3].split("=");
  var userdob = data_arr[4].split("=");
  var userverif = data_arr[6].split("=");
  var bankid = data_arr[8].split("=");
  var bankbranch = data_arr[9].split("=");
  var bankaccount = data_arr[10].split("=");

  var namefix = username[1]
  namefix = namefix.replace("+", " ");

  var addressfix = useraddress[1]
  addressfix = addressfix.replace("+", " ");

  var cityfix = usercity[1]
  cityfix = cityfix.replace("+", " ");

  var today = new Date();
  var today_short = today.toISOString().split("T")[0];

  const certifdata = {
      theID: userid[1],
      theName:namefix,
	    theAddress:addressfix,
      theCity:cityfix,
      theDOB:userdob[1],
      theVerif:userverif[1],
      theIssued:today_short,
      theBankID:bankid[1],
      theBankBranch:bankbranch[1],
      theBankAccount:bankaccount[1],
  }

  //openModal("Scan this code to accept a connectionless credential:");
  //openModal("סרקו את הברקוד על ידי אפליקציית הארנק הדיגיטלי שלכם:");
  openModal("סרקו את הברקוד בעזרת אפליקציית הארנק הדיגיטלי שלכם:");
  hideQRCode();
  showSpinner();
  axios.post('/api/issue', certifdata).then(async (response) => {
      setQRCodeImage(response.data.offerUrl);
      hideSpinner();
      showQRCode();
  });
}

async function issueIDcard() {

  const idcarddata = {
      theID: document.getElementById("issue-id").value,
      theIDtype: document.getElementById("issue-id-type").value,
      theName: document.getElementById("issue-name").value,
      theAddress: document.getElementById("issue-address").value,
      theCity: document.getElementById("issue-city").value,
      theDOB: document.getElementById("issue-dob").value,
      theIssued: document.getElementById("issue-doc").value,
      theValid: document.getElementById("issue-dov").value,
  }

  //openModal("Scan this code to accept a connectionless credential:");
  //openModal("סרקו את הברקוד על ידי אפליקציית הארנק הדיגיטלי שלכם:");
  openModal("סרקו את הברקוד בעזרת אפליקציית הארנק הדיגיטלי שלכם:");
  hideQRCode();
  showSpinner();
  axios.post('/api/issue', idcarddata).then(async (response) => {
      setQRCodeImage(response.data.offerUrl);
      hideSpinner();
      showQRCode();
  });
}

async function verifyPerson() {
    hideAccepted();
    //openModal("Scan this code to verify the passport credential:");
    //openModal("סרקו את הברקוד על ידי אפליקציית הארנק הדיגיטלי שלכם:");
    openModal("סרקו את הברקוד בעזרת אפליקציית הארנק הדיגיטלי שלכם:");
    hideQRCode();
    showSpinner();
    let response = await axios.post('/api/verify');
    let verificationId = response.data.verificationId;
    setQRCodeImage(response.data.verificationRequestUrl);
    hideSpinner();
    showQRCode();

    let verification = {state: "Requested"};
    let timedOut = false;
    setTimeout(() => timedOut = true, 1000 * 60);
    while (!timedOut && verification.state === "Requested") {
        let checkResponse = await axios.get('/api/checkVerification', {params: {verificationId: verificationId }});
        verification = checkResponse.data.verification;
    }

    console.log('index.js - verifyPerson - 1')

    hideQRCode();
    closeModal();
    if (verification.state === "Accepted") {
        showAccepted();
        setAcceptedData(
            verification.proof.getpersondetails.attributes["ID"],
            verification.proof.getpersondetails.attributes["IDtype"],
            verification.proof.getpersondetails.attributes["Name"],
            verification.proof.getpersondetails.attributes["City"],
            verification.proof.getpersondetails.attributes["DOB"],
            verification.proof.getpersondetails.attributes["Valid"]
        );
    }
}

async function verifyPersonRedirect() {
    hideAccepted();
    openModal("סרקו את הברקוד בעזרת אפליקציית הארנק הדיגיטלי שלכם:");
    hideQRCode();
    showSpinner();
    let response = await axios.post('/api/verify');
    let verificationId = response.data.verificationId;
    setQRCodeImage(response.data.verificationRequestUrl);
    hideSpinner();
    showQRCode();

    let verification = {state: "Requested"};
    let timedOut = false;
    setTimeout(() => timedOut = true, 1000 * 60);
    while (!timedOut && verification.state === "Requested") {
        let checkResponse = await axios.get('/api/checkVerification', {params: {verificationId: verificationId }});
        verification = checkResponse.data.verification;
    }

    hideQRCode();
    closeModal();
    if (verification.state === "Accepted") {

      var theProof = verification.proof

      has_id_cert = theProof.hasOwnProperty('תעודת_זהות')
      has_bank_id_cert = theProof.hasOwnProperty('תעודת_חשבון_בנק')

      var theURL = window.location.protocol + '//' + window.location.hostname + '/verifiedBankUser.html';
      var theParams = ''

      if (has_id_cert)
      {
        theParams = theParams + '?id_userid=' + verification.proof.תעודת_זהות.attributes["ID"] + '&id_username=' + verification.proof.תעודת_זהות.attributes["Name"];
        theParams = theParams + '&id_address=' + verification.proof.תעודת_זהות.attributes["Address"] + '&id_city=' + verification.proof.תעודת_זהות.attributes["City"];
        theParams = theParams + '&id_dob=' + verification.proof.תעודת_זהות.attributes["DOB"] + '&id_valid=' + verification.proof.תעודת_זהות.attributes["Valid"];
      }

      console.log(theParams)

      if (has_bank_id_cert)
      {
        if (theParams.length > 0)
        {
          theParams = theParams + '&bank_userid=' + verification.proof.תעודת_חשבון_בנק.attributes["ID"] + '&bank_bankid=' + verification.proof.תעודת_חשבון_בנק.attributes["Bank_id"];
          theParams = theParams + '&bank_branchid=' + verification.proof.תעודת_חשבון_בנק.attributes["Branch_id"] + '&bank_accountid=' + verification.proof.תעודת_חשבון_בנק.attributes["Account_id"];
        }
        else
        {
          theParams = theParams + '?bank_userid=' + verification.proof.תעודת_חשבון_בנק.attributes["ID"] + '&bank_bankid=' + verification.proof.תעודת_חשבון_בנק.attributes["Bank_id"];
          theParams = theParams + '&bank_branchid=' + verification.proof.תעודת_חשבון_בנק.attributes["Branch_id"] + '&bank_accountid=' + verification.proof.תעודת_חשבון_בנק.attributes["Account_id"];
        }
      }

      console.log(theParams)

      if (has_id_cert || has_bank_id_cert)
      {
        theParams = theParams + '&verificationid=' + verificationId
      }

      console.log(theParams)

      window.location.replace(theURL+theParams);
    }
}

function openModal1() {
    modal.style.display = "block";
}

function openModal(text) {
    modal.style.display = "block";
    modalText.innerText = text;
}

function closeModal() {
    modal.style.display = "none";
}

function hideQRCode() {
    qr.style.display = "none";
}

function hideQRCode1() {
    let qrImage = document.getElementsByClassName("qr-image")[0];
    if (qrImage) {
        qrImage.remove();
    }
    qr.style.display = "none";
}

function showQRCode() {
    qr.style.display = "block";
}

function setQRCodeImage(url) {
    qr.src = 'https://chart.googleapis.com/chart?cht=qr&chl=' + url + '&chs=300x300&chld=L|1';
}

function setQRCodeImage1(url) {
    let svgElement = document.createElement("div");
    let s = QRCode.generateSVG(url, {
        ecclevel: "M",
        fillcolor: "#FFFFFF",
        textcolor: "#373737",
        margin: 4,
        modulesize: 8,
    });
    s.classList.add("qr-image");
    svgElement.appendChild(s);
    qr.appendChild(s);
}

function hideSpinner() {
    spinner.style.display = "none";
}

function showSpinner() {
    spinner.style.display = "block";
}

function hideAccepted() {
    accepted.style.display = "none";
}

function showAccepted() {
    accepted.style.display = "block";
}

function setAcceptedData(theID, theIDtype, theName, theCity, theDOB, theValid) {
    acceptedID.value = theID;
    acceptedIDType.value = theIDtype;
    acceptedName.value = theName;
    acceptedCity.value = theCity;
    acceptedDOB.value = theDOB;
    acceptedValid.value = theValid;
}

function getNum(thepower)
{
  var theMult = 10 ** thepower
  var theNum = Math.floor(Math.random() * theMult);
  return theNum;
}

function padLeadingZeros(num, size)
{
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

function createUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function createIID() {
    return 'xxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 9 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(9);
    });
}

function createAccountID() {
    return 'xxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 6 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(6);
    });
}
