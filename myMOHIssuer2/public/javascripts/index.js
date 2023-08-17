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

    console.log("dir=public/javascript | file=index.js | function=verifyPerson | #1");

    hideQRCode();
    closeModal();
    if (verification.state === "Accepted") {
        showAccepted();
        console.log("dir=public/javascript | file=index.js | function=verifyPerson | #2");
        setAcceptedData(
            verification.proof.zehut.attributes["ID"],
            verification.proof.zehut.attributes["Name"],
            verification.proof.zehut.attributes["Valid"],
            verification.proof.covidvaccine.attributes["ID"],
            verification.proof.covidvaccine.attributes["Name"],
            verification.proof.covidvaccine.attributes["Valid"]
        );
    }

    console.log("dir=public/javascript | file=index.js | function=verifyPerson | #3");
}

async function verifyPersonRedirect() {

    hideAccepted();
    //openModal("Scan this code to verify the passport credential:");
    //openModal("סרקו את הברקוד על ידי אפליקציית הארנק הדיגיטלי שלכם:");
    //openModal("סרקו את הברקוד בעזרת אפליקציית הארנק הדיגיטלי שלכם:");
    openModal("סרקו את הברקוד בעזרת אפליקציית הארנק הדיגיטלי שלכם:");
    //openModal("scoobydoo");
    hideQRCode();
    showSpinner();

    console.log("dir=public/javascript | file=index.js | function=verifyPersonRedirect | #1");

    let response = await axios.post('/api/verify');
    let verificationId = response.data.verificationId;
    setQRCodeImage(response.data.verificationRequestUrl);
    hideSpinner();
    showQRCode();


    let verification = {state: "Requested"};
    let timedOut = false;
    setTimeout(() => timedOut = true, 1000 * 60);
    while (!timedOut && verification.state === "Requested") {
        
        console.log("dir=public/javascript | file=index.js | function=verifyPersonRedirect | #2");

        let checkResponse = await axios.get('/api/checkVerification', {params: {verificationId: verificationId }});
        verification = checkResponse.data.verification;

        console.log("dir=public/javascript | file=index.js | function=verifyPersonRedirect | #3");
        console.log(verification);
    }

    console.log("dir=public/javascript | file=index.js | function=verifyPersonRedirect | #4");

    hideQRCode();
    closeModal();
    if (verification.state === "Accepted") {
      console.log("dir=public/javascript | file=index.js | function=verifyPersonRedirect | #5");
      console.log(verification);

      //var theURL = window.location.protocol + '//' + window.location.hostname + '/verifiedMOHUser.html';
	    var theURL = window.location.origin + '/verifiedMOHUser2.html';
      var theParams = '?id_userid=' + verification.proof.zehut.attributes["ID"] + '&id_username=' + verification.proof.zehut.attributes["Name"];
      theParams = theParams + '&id_valid=' + verification.proof.zehut.attributes["Valid"];
      theParams = theParams + '&vac_userid=' + verification.proof.covidvaccine.attributes["ID"] + '&vac_username=' + verification.proof.covidvaccine.attributes["Name"];
      theParams = theParams + '&vac_valid=' + verification.proof.covidvaccine.attributes["Valid"];
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
