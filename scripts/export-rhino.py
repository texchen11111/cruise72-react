"""Extract saved Rhino render meshes; never substitute bounding boxes for geometry.

Run with Python 3 and rhino3dm==8.17.0:
  python scripts/export-rhino.py [path/to/梯柱 节点.3dm]
Generated meshes use millimetres, X right, Y up, Z out from the wall.
"""
import hashlib
import json
import pathlib
import shutil
import sys

import rhino3dm as rhino

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'models' / 'rhino'
SOURCE = ASSETS / 'source' / 'ladder-node.3dm'
if len(sys.argv) > 1:
    incoming = pathlib.Path(sys.argv[1])
    SOURCE.parent.mkdir(parents=True, exist_ok=True)
    if incoming.resolve() != SOURCE.resolve():
        shutil.copyfile(incoming, SOURCE)
doc = rhino.File3dm.Read(str(SOURCE))
assert doc is not None, 'Cannot read source model'
assert doc.Settings.ModelUnitSystem == rhino.UnitSystem.Millimeters


def xyz(p, center):
    return [round(p.X - center[0], 6), round(p.Z - center[2], 6),
            round(center[1] - p.Y, 6)]


def meshes(geometry):
    if isinstance(geometry, rhino.Mesh):
        return [geometry]
    if isinstance(geometry, rhino.Extrusion):
        result = [geometry.GetMesh(rhino.MeshType.Render)]
    elif isinstance(geometry, rhino.Brep):
        result = [face.GetMesh(rhino.MeshType.Render) for face in geometry.Faces]
    else:
        raise ValueError(f'Unsupported geometry: {type(geometry).__name__}')
    if not result or any(mesh is None for mesh in result):
        raise ValueError('Missing saved render mesh: save the shaded model in Rhino first')
    return result


parts = []
for index, obj in enumerate(doc.Objects):
    layer = doc.Layers[obj.Attributes.LayerIndex].Name
    name = obj.Attributes.Name or f'ladder-part-{index}'
    if layer == '默认':
        role = 'pillar'
        center = [2497.45, -7.6, 860.1]
    else:
        center = [2497.45, -7.6, 1420.0]
        if layer == 'V3_02_可换挂接背板':
            role = 'backplate'
        elif any(key in name for key in ['前压板', '圆导柱', '轴尾防拔']):
            role = 'slider'
        else:
            role = 'cartridge'
    positions = []
    normals = []
    indices = []
    for mesh in meshes(obj.Geometry):
        offset = len(positions) // 3
        assert len(mesh.Normals) == len(mesh.Vertices), f'No normals on {name}'
        for point, normal in zip(mesh.Vertices, mesh.Normals):
            positions.extend(xyz(point, center))
            normals.extend([round(normal.X, 6), round(normal.Z, 6), round(-normal.Y, 6)])
        for a, b, c, d in mesh.Faces:
            indices.extend([offset + a, offset + b, offset + c])
            if c != d:
                indices.extend([offset + a, offset + c, offset + d])
    parts.append({
        'id': str(obj.Attributes.Id), 'name': name, 'role': role,
        'positions': positions, 'normals': normals, 'indices': indices,
    })

assert len(parts) == 68, 'This exporter expects the reviewed 68-part assembly'
manifest = {
    'sourceFile': '梯柱 节点.3dm',
    'sourcePath': 'models/rhino/source/ladder-node.3dm',
    'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'method': 'saved Rhino render meshes, no remodelling, no hardware scaling',
    'units': 'mm', 'toleranceMm': doc.Settings.ModelAbsoluteTolerance,
    'partCount': len(parts),
    'pillar': {
        'widthMm': 26.4, 'depthMm': 28.8, 'segmentHeightMm': 720,
        'rungPitchMm': 25, 'rungTopFirstMm': 74.9, 'rungCount': 24,
        'nodeCenterBelowUpperRungMm': 15,
    },
    'node': {
        'widthMm': 48, 'heightMm': 48,
        'fixedPadFrontMm': 33.4, 'jawBackMm': 40.4,
        'referenceExhibitMm': 6, 'referenceGapMm': 7,
        'guideDiameterMm': 6, 'guideLengthMm': 30,
        'maxOutwardTravelMm': 7,
        'exhibitRangeMm': [1, 12],
        'padRegionXYMm': [-23, 7, -7, 23],
    },
}
(ASSETS / 'generated').mkdir(parents=True, exist_ok=True)
assembly_text = json.dumps({'parts': parts}, ensure_ascii=False, separators=(',', ':')) + '\n'
(ASSETS / 'generated' / 'assembly.json').write_text(assembly_text)
# The renderer imports the mesh bundle synchronously; keep a copy inside src so
# tests and the bundler never fetch at runtime. Single source: regenerate here.
SCENE_COPY = ROOT / 'src' / 'scene' / 'models' / 'rhino' / 'assembly.json'
SCENE_COPY.parent.mkdir(parents=True, exist_ok=True)
SCENE_COPY.write_text(assembly_text)
(ASSETS / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({
    'parts': len(parts), 'triangles': sum(len(p['indices']) // 3 for p in parts),
    'sourceSha256': manifest['sourceSha256'],
}))
