import { PNG } from "pngjs/browser";
import str from "string-to-stream";

function base64ToArrayBuffer(base64) {
  var binary_string = window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event));
});

async function handleRequest({ request }) {
  try {
    if (request.method === "GET") {
      const res = new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Img color</title>
        </head>
        <body>
          Upload a PNG:
          <input type="file" onchange="post()"/>

          <script>
            function post() {
              var file = document.querySelector('input[type=file]').files[0];
              var reader = new FileReader();

              reader.addEventListener('load', function () {
                fetch('https://that-test.site/img-color', {
                  method: "POST",
                  body: reader.result
                })
                  .then(res => res.text())
                  .then(rgb => {
                    document.body.style.backgroundColor = "rgb(" + rgb + ")";
                  });
              }, false);

              if (file) {
                reader.readAsDataURL(file);
              }
            }
          </script>
        </body>
      </html>
    `);
      res.headers.set("content-type", "text/html");
      return res;
    }

    if (request.method === "POST") {
      const [, base64] = (await request.text()).split(",");

      return await new Promise(ok => {
        str(base64ToArrayBuffer(base64))
          .pipe(
            new PNG({
              filterType: 4
            })
          )
          .on("parsed", function() {
            const size = this.width * this.height;
            const rgb = [0, 0, 0];
            for (var y = 0; y < this.height; y++) {
              for (var x = 0; x < this.width; x++) {
                var idx = (this.width * y + x) << 2;
                rgb[0] += this.data[idx];
                rgb[1] += this.data[idx + 1];
                rgb[2] += this.data[idx + 2];
              }
            }

            const meanRgb = [
              Math.floor(rgb[0] / size),
              Math.floor(rgb[1] / size),
              Math.floor(rgb[2] / size)
            ];

            ok(new Response(meanRgb));
          });
      });
    }

    return new Response("not found", { status: 404 });
  } catch (err) {
    console.log(err);
    return new Response(err.stack, { status: 500 });
  }
}
