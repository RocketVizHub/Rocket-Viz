async function handleFileUpload() {
  try {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (file) {
      const fileContent = await readFileAsync(file);
      const data = JSON.parse(fileContent);

      // Display file details
      displayFileDetails(data);
    } else {
      console.error("No file selected.");
    }
  } catch (error) {
    console.error("Error reading file:", error);
  }
}

async function readFileAsync(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (event) {
      resolve(event.target.result);
    };

    reader.onerror = function (error) {
      reject(error);
    };

    reader.readAsText(file);
  });
}

function displayFileDetails(data) {
  console.log(Object.keys(data.properties));
  console.log(getMaxFrames(data));
  console.log(getMaxTempsPartie(getMaxFrames(data), getFramerate(data)));
  console.log(getListeFramesHighlights(data));
  console.log(getListFramesGoals(data));
  const fileDetailsElement = document.getElementById("fileDetails");
  fileDetailsElement.innerHTML = `
                <p><strong>header size:</strong> ${data.header_size}</p>
				<p><strong>Replay Name:</strong> ${data.properties.ReplayName}</p>
            `;
}

/** Partie Nicolas  **/
function getFramerate(data) {
  return data.properties.RecordFPS;
}

function getMaxFrames(data) {
  return data.properties.NumFrames; // récupère le nombre de frame max
}

function getMaxTempsPartie(nbFrames, framerate) {
  const dureeEnSecondes = nbFrames / framerate;
  const dureeEnMinutes = Math.floor(dureeEnSecondes / 60); // Partie entière des minutes
  const dureeEnSecondesRestantes = Math.round(dureeEnSecondes % 60); // Partie en secondes

  return `${dureeEnMinutes} minutes et ${dureeEnSecondesRestantes} secondes`;
}

function getListeFramesHighlights(data) {
  const highlights = data.properties.HighLights; // Récupérer la liste des moments forts
  const framesHighlights = highlights.map((highlight) => highlight.frame); // Récupérer les valeurs de la propriété "frame"
  return framesHighlights;
}

function getListFramesGoals(data) {
  const goals = data.properties.Goals;
  const framesGoals = goals.map((goal) => goal.frame);
  return framesGoals;
}

/***********************/

document
  .getElementById("uploadButton")
  .addEventListener("click", handleFileUpload);
