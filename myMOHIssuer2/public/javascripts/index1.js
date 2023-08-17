async function issueGreenPass3(anSTR1) {

  var userdata = decodeURIComponent(urlParams)

  console.log("dir=public/javascripts | file=index1.js | function=issueGreenPass3 | #1");
  console.log(userdata);

  //id_userid=000724057&id_username=מאיר+זושנוב&id_valid=2025-09-01&vac_userid=000724057&vac_username=מאיר+זושנוב&vac_valid=2021-12-31

  var data_arr = userdata.split("&");
  var userid = data_arr[0].split("=");
  var username = data_arr[1].split("=");

  var namefix = username[1]
  namefix = namefix.replace("+", " ");

  var today = new Date();
  var today_short = today.toISOString().split("T")[0];

  var next_year = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
  var next_year_short = next_year.toISOString().split("T")[0]


  const certifdata = {
      theID: userid[1],
      theName:namefix,
	  theReason:'VACCINE',
      theIssued:today_short,
      theValid:next_year_short,
  }

  console.log("dir=public/javascripts | file=index1.js | function=issueGreenPass3 | #2");
  console.log(certifdata);

  //console.log(certifdata)

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
