# Graph model

Nodes are entities, not decorations.

| Type | Drawn as | Meaning |
| --- | --- | --- |
| Organization | Sphere with a ring | The tenant |
| Project | Large sphere | A body of work |
| Location | Diamond | A place with coordinates |
| Activity | Cone | A sustainability category |
| Evidence set | Solid | A session, before set, or after set |
| Media | Card on a sphere | One Cloudinary or local asset |
| Report | Slab | A brief |
| Partner | Gem | An outside organization |

Edges carry a relation, a confidence, and a short list of reasons. Structural edges come from the foreign keys. Stored edges cover `BEFORE_OF` and `SIMILAR_TO`.

The default view hides media so a large archive does not arrive as a galaxy. Showing media, or switching to evidence mode, expands the cluster. Dragging a node pins it. Right-clicking a project is the expand gesture.

Color is paired with shape. The node index lists every type in text.
