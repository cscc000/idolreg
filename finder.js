var matcher, tags;
$(document).ready(() => {
    Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('./models')
    ]).then(() => {
        $.get("./samples.json", (samples) => {
            let d = [];
            tags = [];
            for (var i = 0; i < samples.length; i++) {
                let a = [];
                samples[i].d.forEach((v) => {
                    a.push(Float32Array.from(v));
                });
                d.push(new faceapi.LabeledFaceDescriptors(i.toString(), a));
                tags.push(samples[i].t);
            }
            console.log(d);
            matcher = new faceapi.FaceMatcher(d, 0.5);
            console.log(matcher);
            function loadImg(uri) {
                let img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = async function () {
                    var dim;
                    if (img.width < 500) {
                        dim = { width: img.width, height: img.height };
                    } else {
                        dim = { width: 500, height: Math.round(img.height * 500 / img.width) };
                    }
                    $("#main-canvas").attr(dim);
                    let cv = $("#main-canvas")[0];
                    cv.getContext("2d").drawImage(img, 0, 0, dim.width, dim.height);
                    $("#info-msg").html("Calculating...");
                    setTimeout(async ()  => {
                        let detections = await faceapi.detectAllFaces(cv).withFaceLandmarks().withFaceDescriptors();
                        console.log(detections);
                        if (detections.length == 0) {
                            $("#info-msg").html("");
                            $("#error-msg").html("No face detected!");
                            return;
                        }
                        let results = [];
                        for(var i = 0; i < detections.length; i++) {
                            let match = matcher.findBestMatch(detections[i].descriptor, 0.4);
                            console.log(match);
                            if (match._label != 'unknown' && match._distance < 0.4) {
                                results.push(tags[parseInt(match._label)]);
                            } else {
                                results.push(undefined);
                            }
                        }
                        let multi = detections.length > 1,
                            html = `Found ${detections.length} face${multi? 's':''}:<br><ul>`, ii = 1;
                        for(var t of results) {
                            html += `<li>Face #${ii++} `;
                            if (t) {
                                html += `has tag(s): ${t.join(', ')}`;
                            } else {
                                html += 'has no tag';
                            }
                            html += '</li>';
                        }
                        const size = faceapi.resizeResults(detections, dim);
                        for(var i = 0; i < size.length; i++) {
                            const drawBox = new faceapi.draw.DrawBox(size[i].detection.box, {label: (i + 1).toString(), lineWidth: 2});
                            drawBox.draw(cv);
                        }
                        $("#info-msg").html(html + '</ul>');
                        $("#error-msg").html("");
                    }, 50);
                };
                img.src = uri;
            }
            $("#load-btn").click(() => {
                loadImg($("#img-url").val());
                $("#img-url").val("");
            });
            $("#local-img").change((evt) => {
                var tgt = evt.target || window.event.srcElement,
                    files = tgt.files;
                // FileReader support
                if (FileReader && files && files.length) {
                    var fr = new FileReader();
                    fr.onload = () => {loadImg(fr.result); $("#local-img").val("")};
                    fr.readAsDataURL(files[0]);
                }
            });
            $(".img-src").show();
            $("#info-msg").html("Ready!!!");
        }).fail(() => {
            $('#error-msg').html('ERROR: Cannot load samples!');
        });
    })
});