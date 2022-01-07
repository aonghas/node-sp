const spauth = require("node-sp-auth");
const axios = require("axios");
const glob = require("glob");
const fs = require("fs");

let headers = null;
let token = null;

var getDirectories = function (src, callback) {
  glob(src + "/**/*.*", callback);
};

function authenticate(url, credentialOptions) {
  return new Promise((resolve, reject) => {
    const creds = credentialOptions || null;
    //get auth options
    console.log(url);

    spauth.getAuth(url, creds).then((options) => {
      //perform request with any http-enabled library (request-promise in a sample below):
      headers = options.headers;
      headers["Accept"] = "application/json;odata=nometadata";
      headers["content-type"] = "application/json";

      axios({
        method: "post",
        url: url + "_api/contextinfo",
        headers: headers,
      }).then((resp) => {
        token = resp.data.FormDigestValue;
        headers["X-RequestDigest"] = token;
        resolve();
      });
    });
  });
}

async function deploy(payload) {
  if (!payload.url || !payload.deployTo) {
    console.error("must provide url and deployTo");
  } else {
    try {
      await authenticate(payload.url);
      console.log("authenticated!");
      console.log(`deploying to: ${payload.url}sitepages/${payload.deployTo}`);
      await axios({
        method: "post",
        url:
          payload.url +
          `_api/web/GetFolderByServerRelativeUrl('sitepages/${payload.deployTo}')`,
        headers: { ...headers, "If-Match": "*", "X-HTTP-Method": "DELETE" },
      });
    } catch (error) {
      console.log(error);
    }

    getDirectories("dist", async (err, res) => {
      if (err) {
        // console.log("Error", err);
      } else {
        const files = res;

        for (const file of files) {
          const folders = file
            .split("/")
            .slice(0, -1)
            .map((folder) => (folder == "dist" ? payload.deployTo : folder));
          const folderPath = folders.join("/");

          const promises = [];

          function foldersUpTo(folders, i) {
            const newFolder = folders.reduce((acc, curr, index) => {
              if (index <= i) {
                return acc + curr + "/";
              } else {
                return acc;
              }
            }, "");

            return newFolder;
          }

          for (i = 0; i < folders.length; i++) {
            await axios({
              method: "post",
              headers: headers,
              url: payload.url + "_api/web/folders",
              data: {
                ServerRelativeUrl: "SitePages/" + foldersUpTo(folders, i),
              },
            })
              .then(() => {})
              .catch((e) => {});
          }

          const folderDir = `/folders('` + folders.join(`')/folders('`) + `')`;
          filename = file.split("/").pop();
          const url =
            payload.url +
            "_api/web/lists/getByTitle('Site Pages')/RootFolder" +
            folderDir +
            "/files/add(overwrite=true,url='" +
            filename +
            "')";
          axios({
            method: "post",
            data: fs.readFileSync(file),
            url,
            headers: headers,
          })
            .then((resp) => {
              // console.log("nice");
            })
            .catch((e) => {});
        }

        console.log("Deployment complete!");
      }
    });
  }
}

exports.deploy = deploy;
