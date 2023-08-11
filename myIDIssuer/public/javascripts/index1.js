console.log("public/javascript dir | index1.js #1");

async function issueIDwithConnection() {
    const bizCard = {
        ID: document.getElementById("issue-id").value,
        IDtype: document.getElementById("issue-id-type").value,
        Name  : document.getElementById("issue-name").value,
        Address: document.getElementById("issue-address").value,
        City: document.getElementById("issue-city").value,
        DOB: document.getElementById("issue-dob").value,
        Issued: document.getElementById("issue-doc").value,
        Valid: document.getElementById("issue-dov").value
    }
    console.log('index1.js - issueIDwithConnection')
    console.log(bizCard)
    openModal("סרקו את הברקוד בעזרת אפליקציית הארנק הדיגיטלי שלכם:");
    hideQRCode();
    showSpinner();
    axios.post('/api/myissue', bizCard).then((response) => {
        console.log(response);
        let inviteURL = response.data.invitation;
        console.log(inviteURL)
        setQRCodeImage(inviteURL);
        hideSpinner();
        showQRCode();
    });
}

function openModal() {
    modal.style.display = "block";
}

function openModal1(text) {
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
