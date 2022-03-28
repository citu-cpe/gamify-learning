const path = require("path");
const mammoth = require("mammoth");
const fs = require("fs");

const LearningResource = require("../models/learningResource");
let isOffline;

// check internet connection
require("dns").resolve("www.google.com", function (err) {
  if (err) {
    console.log("No connection");
    isOffline = true;
  } else {
    console.log("Connected");
    isOffline = false;
  }
});

const gamify_index = async (req, res) => {
  console.log("Gamify index...");

  if (isOffline) {
    console.log("App is currently running offline...");
    console.log("Cannot retrieve learning resources from DB...");
    res.render("gamify/index", {
      title: "All Learning Resources",
      resources: [],
      offline: true,
    });
  } else {
    console.log("App is currently running online...");
    console.log("Retrieving learning resources from DB...");
    LearningResource.find()
      .sort({ createdAt: -1 })
      .then((result) => {
        console.log("reslen: " + result.length);
        res.render("gamify/index", {
          title: "All Learning Resources",
          resources: result,
          offline: false,
        });
      })
      .catch((err) => {
        res.render("404", { title: "Sorry, something went wrong." });
      });
  }
};

const gamify_create_get = (req, res) => {
  console.log("Gamify create...");
  res.render("gamify/create", { title: "Gamify Create" });
};

const gamify_file_post = (req, res) => {
  if (!req.files) {
    return res.status(400).send("No files were uploaded.");
  }

  const file = req.files.file;
  console.log("Requesting...");
  const extensionName = path.extname(file.name);
  const allowedExtension = [".docx"];
  const targetPath = path.join(__dirname, "..", "files/gamify", file.name);
  console.log("target path: " + targetPath);

  if (!allowedExtension.includes(extensionName)) {
    // return res.status(422).send("Invalid file.");
    return res.status(422).send({
      status: "failed",
      message: "Invalid file.",
    });
  }

  file.mv(targetPath, (err) => {
    if (err) {
      return res.status(500).send(err);
    }

    return res.send({
      status: "success",
      message: "File was uploaded successfully.",
      file: file,
      path: targetPath,
    });
  });
};

const uploadFolder = path.join(__dirname, "..", "files/gamify");

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

let uploadFolderContents = fs.readdirSync(uploadFolder);

var htmlContents = "";

const gamify_file_get = async (req, res) => {
  uploadFolderContents = fs.readdirSync(uploadFolder);
  await parseAllHtml();
  await res.send(JSON.stringify(htmlContents));
};

const options = {
  // reserve  H1 for specific page titles for semantic meaning
  styleMap: ["p[style-name='Heading 1'] => h2:fresh"],
  styleMap: ["p[style-name='Heading 2'] => h3:fresh"],
  styleMap: ["p[style-name='Heading 3'] => h4:fresh"],
  styleMap: ["p[style-name='Heading 4'] => h5:fresh"],
  styleMap: ["p[style-name='Heading 5'] => h6:fresh"],
  styleMap: ["p[style-name='Heading 6'] => p:fresh"],
};

const parseHtml = (file) => {
  return mammoth
    .convertToHtml({ path: `${uploadFolder}/${file}` }, options)
    .then(function (result) {
      let html = result.value;
      // var messages = result.messages;
      htmlContents += html;
    });
};

const parseAllHtml = async () => {
  uploadFolderContents = fs.readdirSync(uploadFolder);
  console.log("Size: " + uploadFolderContents.length);
  for (const file of uploadFolderContents) {
    await parseHtml(file);
  }

  console.log("All files have been parsed...");
};

const gamify_file_delete = async (req, res) => {
  uploadFolderContents = fs.readdirSync(uploadFolder);
  for (const file of uploadFolderContents) {
    const target = path.join(uploadFolder, file);
    await fs.unlink(target, () => {
      console.log("Successfully deleted: " + target);
    });
  }
};

const learning_resource_post = (req, res) => {
  console.log("Save!");
  console.log(req.body);

  const learningResource = new LearningResource(req.body);
  learningResource.active = req.body.active == "on" ? true : false;
  learningResource
    .save()
    .then(() => {
      res.redirect("/gamify");
    })
    .catch((err) => {
      res.render("404", { title: "Sorry, something went wrong." });
    });
};

module.exports = {
  gamify_index,
  gamify_create_get,
  gamify_file_post,
  gamify_file_get,
  gamify_file_delete,
  learning_resource_post,
};
