with import <nixpkgs> {};

stdenv.mkDerivation {

  name = "cdktf-google";

  buildInputs = with pkgs; [
    nodejs-18_x
    yarn
  ];

}

