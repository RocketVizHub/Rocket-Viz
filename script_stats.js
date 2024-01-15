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
  console.log("--- AXEL IS DEBUGGING ---");
  
  debugClassIndices(data);
  console.log(getCarsIds(data));
  ballLocations = getLocations(data, 0);
  console.log(ballLocations);
  minMaxLocations = getMinMaxLocations(ballLocations);
  console.log(minMaxLocations);
  ratioXY = (minMaxLocations.xMax - minMaxLocations.xMin) / (minMaxLocations.yMax - minMaxLocations.yMin);
  xSize = 70;
  ySize = Math.round(xSize * ratioXY);
  heatmap = locationsToHeatmap(ballLocations, xSize, ySize);
  console.log(heatmap);

  heatmap = thresholdHeatmap(heatmap);

  const width = 350;
  const height = 350 * ratioXY;
  displayHeatmap(
      heatmap,
      {
        width: width,
        height: height,
        container: "#ball_heatmap",
        start_color: "#FC7C89",
        end_color: "#21A38B"
      }
  );
  
  console.log("--- DEBUGGED ---");
}

/**
 * Logs the class indices of the given data.
 * @param {Object} data - The data object.
 */
function debugClassIndices(data) {
  console.log(data.class_indices);
}

/**
 * Retrieves the stream IDs of cars from the given data.
 * @param {Object} data - The data object containing class indices and net cache.
 * @returns {Array} - An array of stream IDs.
 */
function getCarsIds(data) {
  const class_indices = data.class_indices;
  const index = class_indices.filter((class_index) => class_index.class === "TAGame.RBActor_TA")[0].index;

  const net_cache = data.net_cache;
  const indices = net_cache.filter((obj) => obj.object_ind === index)[0].properties;
  const stream_ids = new Array();
  indices.forEach((obj) => stream_ids.push(obj.stream_id));
  return stream_ids;
}

/**
 * Retrieves the locations of a specific actor from the given data.
 * @param {Object} data - The data containing network frames.
 * @param {string} actor_id - The ID of the actor to retrieve locations for.
 * @returns {Array} - An array of locations, each containing the frame time and actor location.
 */
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

/**
 * Calculates the minimum and maximum values for each coordinate (x, y, z) in the given locations array.
 * @param {Array} locations - An array of locations, where each location is an array containing a name and an object with x, y, and z coordinates.
 * @returns {Object} - An object containing the minimum and maximum values for each coordinate (xMin, xMax, yMin, yMax, zMin, zMax).
 */
function getMinMaxLocations(locations) {
  let xMin = 0;
  let xMax = 0;
  let yMin = 0;
  let yMax = 0;
  let zMin = 0;
  let zMax = 0;

  locations.forEach((location) => {
    const x = location[1].x;
    const y = location[1].y;
    const z = location[1].z;

    if (x < xMin) {
      xMin = x;
    } else if (x > xMax) {
      xMax = x;
    }

    if (y < yMin) {
      yMin = y;
    } else if (y > yMax) {
      yMax = y;
    }

    if (z < zMin) {
      zMin = z;
    } else if (z > zMax) {
      zMax = z;
    }
  }
  );

  return {
    xMin: xMin,
    xMax: xMax,
    yMin: yMin,
    yMax: yMax,
    zMin: zMin,
    zMax: zMax
  };
}

/**
 * Translates the locations by subtracting the minimum values of each coordinate axis.
 * @param {Array} locations - The array of locations to be translated.
 * @returns {Array} - The translated locations.
 */
function translateLocations(locations) {
  const minMaxLocations = getMinMaxLocations(locations);
  const translatedLocations = new Array();
  locations.forEach((location) => {
    const x = location[1].x;
    const y = location[1].y;
    const z = location[1].z;

    const translatedX = x - minMaxLocations.xMin;
    const translatedY = y - minMaxLocations.yMin;
    const translatedZ = z - minMaxLocations.zMin;

    translatedLocations.push([location[0], { x: translatedX, y: translatedY, z: translatedZ }]);
  });
  return translatedLocations;
}

/**
 * Returns a 2D array representing the heatmap based on the given locations.
 * The first dimension represents the x-axis, and the second dimension represents the y-axis.
 * The function divides the field into xSize * ySize squares and counts the number of times the ball was in each square.
 * @param {Array} locations - An array of locations, where each location is an array containing the time it was captured and an object with x, y, and z coordinates.
 * @param {number} xSize - The number of squares on the x-axis.
 * @param {number} ySize - The number of squares on the y-axis.
 * @returns {Array} - A 2D array representing the heatmap.
 */
function locationsToHeatmap(locations, xSize, ySize) {
  /*
    Returns a 2d-array of the heatmap, the first dimension is the x-axis, the second is the y-axis.
    We will devide the field in 1000x1000 squares, and count the number of times the ball was in each square.
    param: locations - An array of locations, where each location is an array containing the time it has been captured and an object with x, y, and z coordinates.

    we will add 1 to the corresponding square every 0.02 seconds
  */
  let heatmap = new Array(ySize);
  for (let i = 0; i < heatmap.length; i++) {
    heatmap[i] = new Array(xSize);
    for (let j = 0; j < heatmap[i].length; j++) {
      heatmap[i][j] = 0;
    }
  }

  locations = translateLocations(locations);

  const minMaxLocations = getMinMaxLocations(locations);

  locations.forEach((location) => {
    const x = location[1].x;
    const y = location[1].y;

    let xIndex = Math.floor(((x - minMaxLocations.xMin) / (minMaxLocations.xMax - minMaxLocations.xMin)) * xSize);
    let yIndex = Math.floor(((y - minMaxLocations.yMin) / (minMaxLocations.yMax - minMaxLocations.yMin)) * ySize);
    if (xIndex < 0) {
      xIndex = 0;
    } else if (xIndex > xSize-1) {
      xIndex = xSize-1;
    }
    if (yIndex < 0) {
      yIndex = 0;
    }
    else if (yIndex > ySize-1) {
      yIndex = ySize-1;
    }

    // heatmap[xIndex][yIndex] += 1;
    // we want to add 1 to the corresponding square every 0.02 seconds
    const time = location[0];
    // get the next time if we are not at the end of the array 
    const nextTime = locations.indexOf(location) < locations.length - 1 ? locations[locations.indexOf(location) + 1][0] : time+0.02;
    const timeDifference = nextTime - time;
    const numberOfIterations = Math.floor(timeDifference / 0.02);
    heatmap[yIndex][xIndex] += numberOfIterations;
  });
  return heatmap;
}


/**
 * Lower the outliers in a heatmap by setting values above the 95th percentile to the threshold value.
 * 
 * @param {number[][]} heatmap - The heatmap to be thresholded.
 * @returns {number[][]} - The thresholded heatmap.
 */
function thresholdHeatmap(heatmap) {
  /*
    Make a histogram of the heatmap, and lower the outliers
    Use the quantile function to get the 95th percentile
  */
  let histogram = new Array();
  for (let i = 0; i < heatmap.length; i++) {
    for (let j = 0; j < heatmap[i].length; j++) {
      histogram.push(heatmap[i][j]);
    }
  }
  histogram.sort((a, b) => a - b);
  const threshold = d3.quantile(histogram, 0.95);
  for (let i = 0; i < heatmap.length; i++) {
    for (let j = 0; j < heatmap[i].length; j++) {
      if (heatmap[i][j] > threshold) {
        heatmap[i][j] = threshold;
      }
    }
  }
  return heatmap;
}

/**
 * Displays a heatmap based on the provided data and options.
 *
 * @param {Array<Array<number>>} data - The data for the heatmap.
 * @param {Object} options - The options for configuring the heatmap.
 * @param {string} options.container - The container element for the heatmap.
 * @param {string} options.start_color - The starting color for the heatmap.
 * @param {string} options.end_color - The ending color for the heatmap.
 */
function displayHeatmap(data, options) {
  const margin = { top: 50, right: 50, bottom: 180, left: 180 };
  const width = options.width;
  const height = options.height;
  const container = options.container;
  const startColor = options.start_color;
  const endColor = options.end_color;

  // Find our max and min values
  const maxValue = d3.max(data, (layer) => {
    return d3.max(layer, (d) => {
      return d;
    });
  });
  const minValue = d3.min(data, (layer) => {
    return d3.min(layer, (d) => {
      return d;
    });
  });
  const numrows = data.length;
  // assume all subarrays have same length
  const numcols = data[0].length;

  // Create the SVG container
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Add a background to the SVG
  const background = svg
    .append("rect")
    .style("stroke", "black")
    .attr("width", width)
    .attr("height", height);

  // Build some scales for us to use
  const x = d3.scale.ordinal().domain(d3.range(numcols)).rangeBands([0, width]);
  const y = d3.scale
    .ordinal()
    .domain(d3.range(numrows))
    .rangeBands([0, height]);

  // scale our colors from the start
  // color to the end color.
  const colorMap = d3.scale
    .linear()
    .domain([minValue, maxValue])
    .range([startColor, endColor]);

  // Generate rows and columns and add
  // color fills.
  const row = svg
    .selectAll(".row")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "row")
    .attr("transform", (d, i) => {
      return "translate(0," + y(i) + ")";
    });

  const cell = row
    .selectAll(".cell")
    .data((d) => {
      return d;
    })
    .enter()
    .append("g")
    .attr("class", "cell")
    .attr("transform", (d, i) => {
      return "translate(" + x(i) + ", 0)";
    });

  cell
    .append("rect")
    .attr("width", x.rangeBand())
    .attr("height", y.rangeBand()+0.4);
    // .attr("width", x.rangeBand()-0.3) if we want the borders

  row
    .selectAll(".cell")
    .data((d, i) => {
      return data[i];
    })
    .style("fill", colorMap);
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
