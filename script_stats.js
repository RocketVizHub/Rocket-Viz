async function handleFileUpload() {
  try {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (file) {
      const fileContent = await readFileAsync(file);
      const data = JSON.parse(fileContent);

      // Display file details
      displayFileDetails(data);

      // Debug axel
      displayDebugAxel(data);
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
  // console.log(getListFramesGoals(data));
  const fileDetailsElement = document.getElementById("fileDetails");
  fileDetailsElement.innerHTML = `
                <p><strong>header size:</strong> ${data.header_size}</p>
				<p><strong>Replay Name:</strong> ${data.properties.ReplayName}</p>
            `;
}

/** Partie Axel **/
function displayDebugAxel(data) {
  console.log("--- AXEL IS DEBUGGING YOUR MAMA ---");
  
  debugClassIndices(data);
  console.log(getCarsIds(data));
  console.log(getLocations(data, 0));
  
  console.log("--- YOUR MAMA IS DEBUGGED ---");
}

function debugClassIndices(data) {
  console.log(data.class_indices);
}

function getCarsIds(data) {
  const class_indices = data.class_indices;
  const index = class_indices.filter((class_index) => class_index.class === "TAGame.RBActor_TA")[0].index;

  const net_cache = data.net_cache;
  const indices = net_cache.filter((obj) => obj.object_ind === index)[0].properties;
  const stream_ids = new Array();
  indices.forEach((obj) => stream_ids.push(obj.stream_id));
  return stream_ids;
}

function getLocations(data, actor_id) {
  const frames = data.network_frames.frames;
  const locations = new Array();
  frames.forEach((frame) => {
    frame.updated_actors.forEach((actor) => {
      // if (actor.attribute && actor.attribute.Reservation) {
      //   namesWithReservation.add(actor.attribute.Reservation.name);
      // }
      if (actor.actor_id === actor_id && actor.attribute && actor.attribute.RigidBody && actor.attribute.RigidBody.location) {
        // console.log(actor.attribute.RigidBody.location);
        locations.push([frame.time, actor.attribute.RigidBody.location]);
      }
    });
  });
  return locations;
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


function getPlayerNamesGoal(data) {
  const goals = data.properties.Goals;
  const playerNames = goals.map((goal) => goal.PlayerName);
  return playerNames;
}

function getFramesGoal(data) {
  const goals = data.properties.Goals;
  const frames = goals.map((goal) => goal.frame);
  return frames;
}

function getAllGoalInformation(data) {
  const goals = data.properties.Goals;
  const goalInformation = goals.map((goal) => {
    return {
      PlayerName: goal.PlayerName,
      frame: goal.frame
    };
  });
  return goalInformation;
}



/***********************/

document
  .getElementById("uploadButton")
  .addEventListener("click", handleFileUpload);
