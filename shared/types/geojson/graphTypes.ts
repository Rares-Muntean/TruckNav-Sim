export interface Node {
    id: number;
    lng: number;
    lat: number;
}

export interface Edge {
    from: number; // node ids
    to: number; // node ids
    w: number; // weight, i.e. distance in meters
    r: number; // road type, i.e. 0 for highway, 1 for primary, etc.
    geometry?: Coord[]; // optional geometry for the edge, used for rendering the route
    dlc?: number; // optional DLC requirement for the edge, used for filtering routes based on owned DLCs
}

export type Coord = [number, number];
