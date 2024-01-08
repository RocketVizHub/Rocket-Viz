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
  console.log(getMaxFrames(data));
  console.log(getMaxTempsPartie(getMaxFrames(data), getFramerate(data)));
  console.log(getListeFramesHighlights(data));
  console.log(filterFramesWithDemolishFx(data));
  console.log(getGoals(data));
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
  return data.properties.NumFrames; // récupère le nombre de frame max
}

function getMaxTempsPartie(nbFrames, framerate) {
  const dureeEnSecondes = nbFrames / framerate;
  const dureeEnMinutes = Math.floor(dureeEnSecondes / 60); // Partie entière des minutes
  const dureeEnSecondesRestantes = Math.round(dureeEnSecondes % 60); // Partie en secondes

  return `${dureeEnMinutes} minutes et ${dureeEnSecondesRestantes} secondes`;
}

function getGoals(data) {
  const goals = data.properties.Goals;
  return goals.map(goal => ({
    frame: goal.frame,
    team: goal.PlayerTeam,
    player: goal.PlayerName
  }));
}


function getPlayersAndTeams(data) {
  const playerStats = data.properties.PlayerStats;
  const knownPlayerName = data.properties.PlayerName;
  const knownPlayerTeam = playerStats.find(player => player.Name === knownPlayerName).Team;
  const oppositeTeam = knownPlayerTeam === 0 ? 1 : 0;
  const allPlayers = filterFramesWithReservation(data);

  const playersAndTeams = playerStats.map(player => ({
    name: player.Name,
    team: player.Team === 0 ? 'Blue' : 'Orange'
  }));

  allPlayers.forEach(playerName => {
    if (!playersAndTeams.some(player => player.name === playerName)) {
      playersAndTeams.push({
        name: playerName,
        team: oppositeTeam === 0 ? 'Blue' : 'Orange'
      });
    }
  });

  return playersAndTeams;
}

function getListeFramesHighlights(data) {
  const highlights = data.properties.HighLights; // Récupérer la liste des moments forts
  const framesHighlights = highlights.map((highlight) => highlight.frame); // Récupérer les valeurs de la propriété "frame"
  return framesHighlights;
}

function filterFramesWithDemolishFx(data) {
  const frames = data.network_frames.frames;
  const framesWithDemolishFx = frames.filter((frame) => {
    return frame.updated_actors.some((actor) => {
      return actor.attribute && actor.attribute.DemolishFx;
    });
  }).map((frame) => frame.time);
  return framesWithDemolishFx;
}

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

function displayTimeline(data) {
  const maxFrames = getMaxFrames(data); // Récupère le nombre de frames max
  const framerate = getFramerate(data); // Récupère la fréquence d'images

  const maxDuration = getMaxTempsPartie(maxFrames, framerate); // Calcul de la durée totale

  var margin = {left: 100}; // Définir une marge à gauche
  var width = 960 - margin.left; // Ajuster la largeur en fonction de la marge
  var height = 500;

  // Création de l'échelle en minutes en fonction des frames
  const maxMinutes = maxFrames / framerate / 60; // Convertir en minutes
  const xScale = d3.scaleLinear()
    .domain([0, maxMinutes])
    .range([0, width]);

  // Supprime l'ancienne timeline
  d3.select("#timeline").selectAll("*").remove();

  // Création du conteneur SVG
  const svg = d3.select("#timeline") // Assurez-vous d'avoir un élément avec l'ID "timeline" dans votre HTML
    .append("svg")
    .attr("width", width + margin.left) // Ajuster la largeur du SVG en fonction de la marge
    .attr("height", height)
  .append("g")
    .attr("transform", "translate(" + margin.left + ",0)"); // Déplacer le groupe à droite de la marge

  // Ajouter un rectangle pour chaque équipe
  svg.append("rect")
    .attr("x", 0)
    .attr("y", height / 4 - 5) // Décalez le rectangle pour une meilleure visibilité
    .attr("width", width)
    .attr("height", 10) // Hauteur du rectangle
    .attr("fill", "blue"); // Couleur du rectangle pour l'équipe bleue

  svg.append("rect")
    .attr("x", 0)
    .attr("y", height / 3 - 5) // Décalez le rectangle pour une meilleure visibilité
    .attr("width", width)
    .attr("height", 10) // Hauteur du rectangle
    .attr("fill", "orange"); // Couleur du rectangle pour l'équipe orange

  
  svg.append("line") // Axe temporel
    .attr("x1", 0)
    .attr("y1", height / 2)
    .attr("x2", width)
    .attr("y2", height / 2)
    .attr("stroke", "black")
    .attr("stroke-width", 2);

  // Ajouter des traits à chaque minute sur l'échelle de temps
  for (let i = 1; i <= maxMinutes; i++) {
    svg.append("line")
      .attr("x1", xScale(i))
      .attr("y1", height / 2 - 5)
      .attr("x2", xScale(i))
      .attr("y2", height / 2 + 5)
      .attr("stroke", "black")
      .attr("stroke-width", 1);
  }

  // Labels pour les équipes avec styles directement dans D3
    svg.append("text")
      .attr("x", -10) // Positionner le texte à gauche du SVG
      .attr("y", height / 4)
      .attr("text-anchor", "end")
      .text("Equipe Bleue")
      .attr("fill", "blue")
      .attr("font-size", "12px"); // Appliquer la taille de la police

    svg.append("text")
      .attr("x", -10) // Positionner le texte à gauche du SVG
      .attr("y", height / 3)
      .attr("text-anchor", "end")
      .text("Equipe Orange")
      .attr("fill", "orange")
      .attr("font-size", "12px"); // Appliquer la taille de la police

    // Ajout du texte pour la durée totale à l'intérieur du SVG avec le style pour ajuster la position verticale
    svg.append("text")
      .attr("x", width / 2) // Positionnez le texte au milieu horizontalement
      .attr("y", height / 2 - 10) // Ajustez la position verticale pour l'aligner avec la ligne noire
      .text(`Duration: ${maxDuration}`)
      .attr("font-size", "12px") // Appliquer la taille de la police
      .style("dominant-baseline", "hanging"); // Style pour aligner verticalement


    const goals = getGoals(data);

    goals.forEach(goal => {
      const x = xScale(goal.frame / framerate / 60); // Convertit la frame en minutes

    // Ajoute un "G" sur la timeline à la position du but
    svg.append("text")
      .attr("x", x)
      .attr("y", goal.team === 0 ? height / 4 : height / 3) // Positionne le "G" sur la ligne de l'équipe correspondante
      .text("G")
      .attr("fill", "black") // Change la couleur en noir
      .on("mouseover", function() { // Ajoute un gestionnaire d'événements pour l'affichage de l'info-bulle
        d3.select(this)
          .append("title") // Ajoute une info-bulle
          .text(`Goal by ${goal.player}`); // Affiche le nom du joueur qui a marqué le but
      });
    });

}

document
  .getElementById("uploadButton")
  .addEventListener("click", handleFileUpload);
