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

    console.log('dir=public/javascripts | file=index.js - verifyPerson - 1')

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
    console.log('dir=public/javascripts | file=index.js - function=verifyPersonRedirect - 0')

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

    console.log('dir=public/javascripts | file=index.js - function=verifyPersonRedirect - 1');

    let verification = {state: "Requested"};
    let timedOut = false;
    setTimeout(() => timedOut = true, 1000 * 60);
    while (!timedOut && verification.state === "Requested") {
        let checkResponse = await axios.get('/api/checkVerification', {params: {verificationId: verificationId }});
        verification = checkResponse.data.verification;

        console.log("verification.state=" + verification.state);

        //let verf_obj = JSON.parse(checkResponse.data);
        //console.log("verf_obj=" + verf_obj);        
    }

    console.log('dir=public/javascripts | file=index.js - function=verifyPersonRedirect - 2');
    console.log("verification.state=" + verification.state);

    hideQRCode();
    closeModal();
    if (verification.state === "Accepted") {
      console.log('dir=public/javascripts | file=index.js - function=verifyPersonRedirect - verification.state=Accepted');

      console.log("Accepted verification=" + verification);
      const myJSON = JSON.stringify(verification);
      console.log(myJSON);

      var theURL = window.location.origin + '/verifiedUser.html';
      var theParams = '?userid=' + verification.proof.Teudat_zehut.attributes["ID"] + '&idtype=' + verification.proof.Teudat_zehut.attributes["IDtype"];
      theParams = theParams + '&username=' + verification.proof.Teudat_zehut.attributes["Name"] + '&city=' + verification.proof.Teudat_zehut.attributes["City"]
      theParams = theParams + '&dob=' + verification.proof.Teudat_zehut.attributes["DOB"] + '&valid=' + verification.proof.Teudat_zehut.attributes["Valid"]
      
      console.log('theURL='+theURL);
      console.log('theParams='+theParams);
      
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
