async function issueCyberCertifDirect2(anID) {

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

async function issueCyberCertifWithConnection1(anID) {
    const certifdata = {
        theID: anID.toString(),
        theCourseName:"מיישם הגנת סייבר",
        theIssuer:"מערך הסייבר הלאומי",
        theIssued:"2021-06-01",
        theValid:"2024-05-31",
    }
    console.log('index1.js - issueIDwithConnection')
    console.log(certifdata)
    openModal("סרקו את הברקוד בעזרת אפליקציית הארנק הדיגיטלי שלכם:");
    hideQRCode();
    showSpinner();
    axios.post('/api/myissue', certifdata).then((response) => {
        console.log(response);
        let inviteURL = response.data.invitation;
        console.log(inviteURL)
        setQRCodeImage(inviteURL);
        hideSpinner();
        showQRCode();
    });
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
        modulesize: 4
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

function createIID() {
    return 'xxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 9 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(9);
    });
}
