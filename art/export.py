"""blender --background --factory-startup --python-exit-code 1 --python art/export.py -- <textures-dir> <models-dir>"""

import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import meshkit
import buildings
import trees

textures, output = map(Path, sys.argv[sys.argv.index("--") + 1 :])
output.mkdir(parents=True, exist_ok=True)
meshkit.setup(textures)
buildings.generate(output)
trees.generate(output)
