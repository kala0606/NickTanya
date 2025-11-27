// The default p5.js vertex shader.
// It's responsible for transforming the vertex positions
// into the correct screen space.
precision highp float;

// attributes provided by p5.js
attribute vec3 aPosition;
attribute vec2 aTexCoord;

// uniforms provided by p5.js
uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;

// for passing to the fragment shader
varying vec2 vTexCoord;

void main() {
  // Pass the texture coordinates to the fragment shader
  vTexCoord = aTexCoord;

  // Calculate the screen position of the vertex
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
} 