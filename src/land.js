const roadMask = canvas(2048, 1024),
  mapG = roadMask.getContext("2d", { willReadFrequently: true });
const mapWidth = 1600,
  mapHeight = 800;
function trace(context, pts, closed = false) {
  const smooth = new T.SplineCurve(
    pts.concat(closed ? [pts[0]] : []).map(([u, v]) => new T.Vector2(u, v)),
  );
  const dots = smooth.getPoints(Math.max(30, pts.length * 10));
  context.beginPath();
  dots.forEach((p, i) => (i ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y)));
  if (closed) context.closePath();
}
function paintLand() {
  mapG.scale(roadMask.width / mapWidth, roadMask.height / mapHeight);
  mapG.fillStyle = "#000";
  mapG.fillRect(0, 0, mapWidth, mapHeight);
  mapG.lineJoin = mapG.lineCap = "round";
  function line(pts, width, col, closed = false) {
    trace(mapG, pts, closed);
    mapG.strokeStyle = col;
    mapG.lineWidth = width;
    mapG.stroke();
  }
  for (const [width, pts] of paths) {
    for (const [extra, c] of [
      [2.4, "#350000"],
      [1.1, "#870000"],
      [0, "#ff0000"],
    ])
      line(pts, width / SCALE + extra, c);
  }
  line(track, 6.8, "#00df00", true);
  for (const s of sites.filter(
    (s) => s.id < 200 && s.style !== "gate" && s.style !== "auditorium" && s.style !== "landmark",
  )) {
    mapG.fillStyle = "#650000";
    mapG.fillRect(s.u - s.w / SCALE / 2 - 1, s.v - s.d / SCALE / 2 - 1, s.w / SCALE + 2, s.d / SCALE + 2);
  }
  // Short approaches from the shaded block on the map to the nearest documented paths.
  line(
    [
      [848, 337],
      [842, 340],
      [835, 354],
      [835, 381],
    ],
    3.4 / SCALE,
    "#ed0000",
  );
  line(
    [
      [892, 293],
      [891, 282],
      [908, 264],
    ],
    2.4 / SCALE,
    "#ed0000",
  );
  for (const v of [147, 179, 211])
    line(
      [
        [1252, v],
        [riverU(v) - 23, v],
      ],
      1.25 / SCALE,
      "#a30000",
    );
  line(
    [
      [1249, 245],
      [1252, 209],
      [1252, 143],
      [1256, 107],
    ],
    1.7 / SCALE,
    "#b00000",
  );
  mapG.setTransform(1, 0, 0, 1, 0, 0);
}
paintLand();
const maskPixels = mapG.getImageData(0, 0, roadMask.width, roadMask.height).data;
function surf(x, z) {
  const u = x / SCALE + 780,
    v = z / SCALE + 370;
  if (u < 0 || v < 0 || u >= mapWidth || v >= mapHeight) return 0;
  const k =
    4 *
    (Math.floor((v / mapHeight) * roadMask.height) * roadMask.width +
      Math.floor((u / mapWidth) * roadMask.width));
  return Math.max(maskPixels[k], maskPixels[k + 1]) / 255;
}
function shoreDistance(x, z) {
  return (riverU(z / SCALE + 370) - (x / SCALE + 780)) * SCALE * 0.8;
}
const riverLevel = -1.05;
function groundY(x, z) {
  const shore = shoreDistance(x, z);
  if (shore < -222) return riverLevel + Math.min(4.2, (-shore - 222) * 0.18);
  return (
    -0.06 +
    0.095 * Math.sin(x * 0.047) * Math.sin(z * 0.053) +
    0.055 * Math.sin(x * 0.108 + z * 0.037) -
    Math.min(3.5, Math.max(0, (3.5 - shore) * 0.4))
  );
}
function terrain(scene) {
  const mask = new T.CanvasTexture(roadMask);
  mask.flipY = false;
  mask.generateMipmaps = true;
  mask.anisotropy = 8;
  const m = std(0xffffff);
  const noise =
    "float hash2(vec2 p){return fract(sin(dot(mod(p,173.0),vec2(41.37,73.17)))*4127.12);} float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+1.),f.x),f.y);}";
  m.onBeforeCompile = (sh) => {
    sh.uniforms.roadMask = { value: mask };
    sh.uniforms.soilPhoto = { value: scans.gravel_road_Diffuse };
    sh.uniforms.grassPhoto = { value: scans.sparse_grass_Diffuse };
    sh.vertexShader =
      "varying vec2 terrainXZ;\n" +
      sh.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nterrainXZ=position.xz;",
      );
    sh.fragmentShader =
      "uniform sampler2D roadMask,soilPhoto,grassPhoto;varying vec2 terrainXZ;\n" +
      noise +
      "\n" +
      sh.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
 vec2 p=terrainXZ;vec2 uv=(p/${SCALE}+vec2(780.,370.))/vec2(1600.,800.);vec2 mask=texture2D(roadMask,uv).rg*step(0.,uv.x)*step(0.,uv.y)*step(uv.x,1.)*step(uv.y,1.);
 float grassMix=noise2(p*.13)*.54+noise2(p*.59)*.26+noise2(p*.032)*.2;
 float closeDetail=1.-smoothstep(.1,.8,length(fwidth(p)));float gravel=noise2(p*24.)-.5,blade=noise2(p*vec2(38.,18.))-.5;
 vec3 meadow=mix(vec3(.057,.106,.033),vec3(.211,.266,.09),grassMix)+closeDetail*blade*.065;
 vec3 path=mix(vec3(.30,.252,.183),vec3(.51,.455,.35),grassMix)+closeDetail*gravel*.14;
 vec3 dust=texture2D(soilPhoto,p*.52).rgb, turf=texture2D(grassPhoto,p*.66).rgb;
 meadow*=clamp(.64+dot(turf,vec3(.28,.58,.14))*5.5,.52,1.46);
 path=mix(path,dust*vec3(1.38,1.45,1.39)+vec3(.070,.065,.050),.77);
 float road=smoothstep(.09,.94,mask.r+(.14*noise2(p*4.)-.07));vec3 ground=mix(meadow,path,road);
 ground=mix(ground,vec3(.32,.225,.153)+gravel*.04,mask.g);
 float shore=(1456.-((p.y/${SCALE}+370.)-86.)*475./630.-(p.x/${SCALE}+780.))*${SCALE * 0.8};
 diffuseColor.rgb=mix(vec3(.22,.19,.135)+gravel*.035,ground,smoothstep(-.8,3.7,shore));`,
      );
  };
  const geo = new T.PlaneGeometry(1250, 1120, 266, 226);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const extend = (v, edge) => v + Math.sign(v) * Math.max(0, Math.abs(v) - edge) * 14;
    const x = extend(pos.getX(i), 420),
      z = extend(pos.getZ(i), 212);
    pos.setXYZ(i, x, groundY(x, z), z);
  }
  geo.computeVertexNormals();
  const soil = mesh(scene, geo, m);
  soil.receiveShadow = true;
  // River occupies the part beyond the sloping bank where the ground falls below its level.
  const waterMat = std(0x708986, { roughness: 0.21, metalness: 0.04 });
  waterMat.onBeforeCompile = (sh) => {
    sh.vertexShader =
      "varying vec2 rippleXZ;\n" +
      sh.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nrippleXZ=position.xz;",
      );
    sh.fragmentShader =
      "varying vec2 rippleXZ;\n" +
      noise +
      "\n" +
      sh.fragmentShader
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float swell = noise2(rippleXZ * 0.16);
          diffuseColor.rgb += vec3(0.033, 0.045, 0.040) * (swell - 0.5);`,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          vec2 phase = vec2(dot(rippleXZ, vec2(1.7, 6.1)), dot(rippleXZ, vec2(4.3, -2.8)));
          phase += swell * vec2(5.0, 7.0);
          vec2 waves = cos(phase) * (1.0 - smoothstep(vec2(0.6), vec2(3.14), fwidth(phase)));
          vec2 slope = vec2(0.031, 0.11) * waves.x + vec2(0.063, -0.041) * waves.y;
          normal = normalize(mat3(viewMatrix) * vec3(-slope.x, 1.0, -slope.y));`,
        );
  };
  const water = new T.PlaneGeometry(7200, 7200);
  water.rotateX(-Math.PI / 2);
  const river = mesh(scene, water, waterMat, 0, riverLevel, 0);
  river.receiveShadow = true;
  return { soil, river };
}
function sky(scene, sunDirection) {
  const mat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    extensions: { derivatives: true },
    uniforms: { sunDirection: { value: sunDirection } },
    vertexShader: `varying vec3 dir;void main(){dir=position;vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.);gl_Position=p.xyww;}`,
    fragmentShader: `
      varying vec3 dir;
      uniform vec3 sunDirection;
      float h(vec2 p){return fract(sin(dot(p,vec2(17.37,59.43)))*4257.31);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      void main() {
        vec3 d = normalize(dir);
        float height = max(0.0, d.y);
        float separation = length(d - sunDirection);
        float sunward = exp(-2.5 * separation);
        vec3 horizon = mix(vec3(0.84, 0.88, 0.89), vec3(1.0, 0.90, 0.75), sunward);
        vec3 col = mix(horizon, vec3(0.28, 0.52, 0.74), sqrt(height));

        vec2 p = d.xz / (height + 0.10) * 2.1;
        float f = 0.52*n(p) + 0.26*n(p*2.04) + 0.135*n(p*4.15) + 0.067*n(p*8.4) + 0.035*n(p*16.);
        float cloud = smoothstep(0.50, 0.76, f) * smoothstep(0.025, 0.16, height);
        vec3 cloudColor = mix(vec3(0.93, 0.95, 0.96), vec3(1.0, 0.93, 0.80), sunward);
        col = mix(col, cloudColor, cloud * 0.80);

        float transmission = 1.0 - 0.82 * cloud;
        float halo = 0.36 * sunward + 0.60 * exp(-16.0 * separation);
        col = mix(col, vec3(1.0, 0.88, 0.66), halo * transmission);
        // The solar disc subtends about half a degree. Filter its edge at screen resolution.
        float aa = max(0.0003, 0.5 * fwidth(separation));
        float disc = 1.0 - smoothstep(0.00465 - aa, 0.00465 + aa, separation);
        float core = mix(0.70 * exp(-58.0 * separation), 1.0, disc);
        gl_FragColor = vec4(mix(col, vec3(1.0, 0.992, 0.94), core * transmission), 1.0);
      }`,
  });
  const dome = mesh(scene, new T.SphereGeometry(1, 48, 24), mat);
  dome.frustumCulled = false;
  dome.renderOrder = -100;
}
