async function issueCyberCertif2(anID) {

  const certifdata = {
      theID: anID.toString(),
      theCourseName:"מיישם הגנת סייבר",
      theIssuer:"מערך הסייבר הלאומי",
      theIssued:"2021-06-01",
      theValid:"2024-05-31",
  }

  console.log(certifdata)

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
            verification.proof.persondetailsfull.attributes["ID"],
            verification.proof.persondetailsfull.attributes["IDtype"],
            verification.proof.persondetailsfull.attributes["Name"],
            verification.proof.persondetailsfull.attributes["City"],
            verification.proof.persondetailsfull.attributes["DOB"],
            verification.proof.persondetailsfull.attributes["Valid"]
        );
    }
}

async function verifyPersonRedirect() {

    hideAccepted();
    //openModal("Scan this code to verify the passport credential:");
    //openModal("סרקו את הברקוד על ידי אפליקציית הארנק הדיגיטלי שלכם:");
    openModal("סרקו את הברקוד בעזרת אפליקציית הארנק הדיגיטלי שלכם:");
    //openModal("scoobydoo");
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
      //var theURL = window.location.protocol + '//' + window.location.hostname + '/verifiedMOHUser.html';
	  var theURL = window.location.origin + '/verifiedMOHUser.html';
      var theParams = '?userid=' + verification.proof.persondetailsfull.attributes["ID"] + '&idtype=' + verification.proof.persondetailsfull.attributes["IDtype"];
      theParams = theParams + '&username=' + verification.proof.persondetailsfull.attributes["Name"] + '&address=' + verification.proof.persondetailsfull.attributes["Address"];
      theParams = theParams + '&city=' + verification.proof.persondetailsfull.attributes["City"] + '&dob=' + verification.proof.persondetailsfull.attributes["DOB"];
      theParams = theParams + '&valid=' + verification.proof.persondetailsfull.attributes["Valid"];
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
