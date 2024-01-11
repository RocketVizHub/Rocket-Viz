async function handleFileUpload() {
  try {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (file) {
      const fileContent = await readFileAsync(file);
      const data = JSON.parse(fileContent);

      // Display file details
      displayFileDetails(data);

      // Afficher la timeline avec les données récupérées
      displayTimeline(data);
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
  console.log(getGoals(data));
  console.log(getLastFrameTime(data));
  const fileDetailsElement = document.getElementById("fileDetails");
  fileDetailsElement.innerHTML = `
                <p><strong>header size:</strong> ${data.header_size}</p>
				<p><strong>Replay Name:</strong> ${data.properties.ReplayName}</p>
            `;
}

function getFramerate(data) {
  return data.properties.RecordFPS;
}

function getMaxFrames(data) {
  return data.properties.NumFrames;
}

function getLastFrameTime(data) {
  if (data.network_frames && data.network_frames.frames.length > 0) {
    const lastFrame =
      data.network_frames.frames[data.network_frames.frames.length - 1];
    return lastFrame.time;
  }
  return null;
}

function getMaxTempsPartie(nbFrames, framerate) {
  const dureeEnSecondes = nbFrames / framerate;
  const dureeEnMinutes = Math.floor(dureeEnSecondes / 60); // Partie entière des minutes
  const dureeEnSecondesRestantes = Math.round(dureeEnSecondes % 60); // Partie en secondes

  return `${dureeEnMinutes} minutes et ${dureeEnSecondesRestantes} secondes`;
}

function getGoals(data) {
  const goals = data.properties.Goals;
  return goals.map((goal) => ({
    frame: goal.frame,
    team: goal.PlayerTeam,
    player: goal.PlayerName,
  }));
}

// Récupère les joueurs et leurs équipes
function getPlayersAndTeams(data) {
  const playerStats = data.properties.PlayerStats;
  const knownPlayerName = data.properties.PlayerName;
  const knownPlayerTeam = playerStats.find(
    (player) => player.Name === knownPlayerName
  ).Team;
  const oppositeTeam = knownPlayerTeam === 0 ? 1 : 0;
  const allPlayers = filterFramesWithReservation(data);

  const playersAndTeams = playerStats.map((player) => ({
    name: player.Name,
    team: player.Team === 0 ? "Blue" : "Orange",
  }));

  allPlayers.forEach((playerName) => {
    if (!playersAndTeams.some((player) => player.name === playerName)) {
      playersAndTeams.push({
        name: playerName,
        team: oppositeTeam === 0 ? "Blue" : "Orange",
      });
    }
  });

  return playersAndTeams;
}

// Récupère la liste des frames qui contiennent un moment fort
function getListeFramesHighlights(data) {
  const highlights = data.properties.HighLights;
  const framesHighlights = highlights.map((highlight) => highlight.frame); // Récupérer les valeurs de la propriété "frame"
  return framesHighlights;
}

// Récupère les frames qui contiennent un DemolishFx
function filterFramesWithDemolishFx(data) {
  const frames = data.network_frames.frames;
  const framesWithDemolishFx = frames
    .filter((frame) => {
      return frame.updated_actors.some((actor) => {
        return actor.attribute && actor.attribute.DemolishFx;
      });
    })
    .map((frame) => frame.time);
  return framesWithDemolishFx;
}

// Récupère les noms des joueurs de la partie, qui ont une réservation
function filterFramesWithReservation(data) {
  const frames = data.network_frames.frames;
  const namesWithReservation = new Set();
  frames.forEach((frame) => {
    frame.updated_actors.forEach((actor) => {
      if (actor.attribute && actor.attribute.Reservation) {
        namesWithReservation.add(actor.attribute.Reservation.name);
      }
    });
  });
  return Array.from(namesWithReservation);
}

// Récupère les saves de la partie, avec l'équipe et la frame
function getSaves(data) {
  const saves = [];
  if (data.tick_marks) {
    data.tick_marks.forEach((tick_mark) => {
      if (
        tick_mark.description === "Team0Goal" ||
        tick_mark.description === "Team1Goal"
      ) {
        saves.push(tick_mark);
      }
    });
  }
  return saves;
}

// Récupère les saves de l'équipe 0
function getTeam0Saves(data) {
  const team0Saves = [];
  if (data.tick_marks) {
    data.tick_marks.forEach((tick_mark) => {
      if (tick_mark.description === "Team0Save") {
        team0Saves.push(tick_mark);
      }
    });
  }
  return team0Saves;
}

// Récupère les saves de l'équipe 1
function getTeam1Saves(data) {
  const team1Saves = [];
  if (data.tick_marks) {
    data.tick_marks.forEach((tick_mark) => {
      if (tick_mark.description === "Team1Save") {
        team1Saves.push(tick_mark);
      }
    });
  }
  return team1Saves;
}

function prepareDataForTimeline(saves, team) {
  return saves.map((save) => ({
    time: save.frame,
    event: save.description,
    team: team,
  }));
}

// Affiche la timeline
function displayTimeline(data) {
  const maxFrames = getMaxFrames(data); // Récupère le nombre de frames max
  const framerate = getFramerate(data); // Récupère la fréquence d'images

  const maxDuration = getMaxTempsPartie(maxFrames, framerate); // Calcul de la durée totale

  var margin = { left: 100 }; // Définir une marge à gauche
  var width = 960 - margin.left; // Ajuster la largeur en fonction de la marge
  var height = 500;

  // Création de l'échelle en minutes en fonction des frames
  const maxMinutes = maxFrames / framerate / 60; // Convertir en minutes
  const xScale = d3.scaleLinear().domain([0, maxMinutes]).range([0, width]);

  // Supprime l'ancienne timeline
  d3.select("#timeline").selectAll("*").remove();

  // Création du conteneur SVG
  const svg = d3
    .select("#timeline") // Assurez-vous d'avoir un élément avec l'ID "timeline" dans votre HTML
    .append("svg")
    .attr("width", width + margin.left) // Ajuster la largeur du SVG en fonction de la marge
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + margin.left + ",0)"); // Déplacer le groupe à droite de la marge

  // Ajouter un rectangle pour chaque équipe
  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", height / 4 - 5) // Décalez le rectangle pour une meilleure visibilité
    .attr("width", width)
    .attr("height", 10) // Hauteur du rectangle
    .attr("fill", "blue"); // Couleur du rectangle pour l'équipe bleue

  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", height / 3 - 5) // Décalez le rectangle pour une meilleure visibilité
    .attr("width", width)
    .attr("height", 10) // Hauteur du rectangle
    .attr("fill", "orange"); // Couleur du rectangle pour l'équipe orange

  svg
    .append("line") // Axe temporel
    .attr("x1", 0)
    .attr("y1", height / 2)
    .attr("x2", width)
    .attr("y2", height / 2)
    .attr("stroke", "black")
    .attr("stroke-width", 2);

  // Ajouter des traits à chaque minute sur l'échelle de temps
  for (let i = 1; i <= maxMinutes; i++) {
    svg
      .append("line")
      .attr("x1", xScale(i))
      .attr("y1", height / 2 - 5)
      .attr("x2", xScale(i))
      .attr("y2", height / 2 + 5)
      .attr("stroke", "black")
      .attr("stroke-width", 1);
  }

  // Labels pour les équipes avec styles directement dans D3
  svg
    .append("text")
    .attr("x", -10) // Positionner le texte à gauche du SVG
    .attr("y", height / 4)
    .attr("text-anchor", "end")
    .text("Equipe Bleue")
    .attr("fill", "blue")
    .attr("font-size", "12px"); // Appliquer la taille de la police

  svg
    .append("text")
    .attr("x", -10) // Positionner le texte à gauche du SVG
    .attr("y", height / 3)
    .attr("text-anchor", "end")
    .text("Equipe Orange")
    .attr("fill", "orange")
    .attr("font-size", "12px"); // Appliquer la taille de la police

  // Ajout du texte pour la durée totale à l'intérieur du SVG avec le style pour ajuster la position verticale
  svg
    .append("text")
    .attr("x", width / 2) // Positionnez le texte au milieu horizontalement
    .attr("y", height / 2 - 10) // Ajustez la position verticale pour l'aligner avec la ligne noire
    .text(`Duration: ${maxDuration}`)
    .attr("font-size", "12px")
    .style("dominant-baseline", "hanging");

  const goals = getGoals(data);

  goals.forEach((goal) => {
    const x = xScale(goal.frame / framerate / 60); // Convertit la frame en minutes

    // Ajoute un "G" sur la timeline à la position du but
    svg
      .append("text")
      .attr("x", x)
      .attr("y", goal.team === 0 ? height / 4 : height / 3) // Positionne le "G" sur la ligne de l'équipe correspondante
      .text("G")
      .attr("fill", "black") // Change la couleur en noir
      .on("mouseover", function () {
        // Ajoute un gestionnaire d'événements pour l'affichage de l'info-bulle
        d3.select(this).append("title").text(`Goal by ${goal.player}`);
      });
  });

  const team0Saves = getTeam0Saves(data);
  const team1Saves = getTeam1Saves(data);

  const timelineDataTeam0 = prepareDataForTimeline(team0Saves, "Team 0");
  const timelineDataTeam1 = prepareDataForTimeline(team1Saves, "Team 1");

  // Ajoute un S sur la timeline de l'équipe 0 à la position de la save
  timelineDataTeam0.forEach((save) => {
    const x = xScale(save.time / framerate / 60);

    svg
      .append("text")
      .attr("x", x)
      .attr("y", height / 4) // Positionne le "S" sur la ligne de l'équipe 0
      .text("S")
      .attr("fill", "black") // Change la couleur en noir
      .on("mouseover", function () {
        // Ajoute un gestionnaire d'événements pour l'affichage de l'info-bulle
        d3.select(this).append("title").text(`Save by ${save.team}`);
      });
  });

  // Ajoute un S sur la timeline de l'équipe 1 à la position de la save
  timelineDataTeam1.forEach((save) => {
    const x = xScale(save.time / framerate / 60); // Convertit la frame en minutes

    svg
      .append("text")
      .attr("x", x)
      .attr("y", height / 3) // Positionne le "S" sur la ligne de l'équipe 1
      .text("S")
      .attr("fill", "black") // Change la couleur en noir
      .on("mouseover", function () {
        // Ajoute un gestionnaire d'événements pour l'affichage de l'info-bulle
        d3.select(this).append("title").text(`Save by ${save.team}`);
      });
  });
}

document
  .getElementById("uploadButton")
  .addEventListener("click", handleFileUpload);
