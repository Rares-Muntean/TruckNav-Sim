export class TypedNodeCoordsMap {
    private array: Float64Array;
    public size: number;

    constructor(array: Float64Array) {
        this.array = array;
        this.size = array.length / 2;
    }

    get(id: number): [number, number] | undefined {
        return this.getLngLat(id);
    }

    has(id: number): boolean {
        const lngLat = this.getLngLat(id);
        if (lngLat === undefined) return false;
        if (lngLat[0] !== 0 || lngLat[1] !== 0) return true;

        return false;
    }

    keys(): IterableIterator<number> {
        const activeKeys: number[] = [];
        for (let i = 0; i < this.array.length; i += 2) {
            const v1 = this.array[i];
            const v2 = this.array[i + 1];

            if (v1 !== undefined && v2 !== undefined && v1 !== 0 && v2 !== 0) {
                activeKeys.push(i / 2);
            }
        }
        return activeKeys[Symbol.iterator]();
    }

    values(): IterableIterator<[number, number]> {
        const activeValues: [number, number][] = [];
        for (let i = 0; i < this.array.length; i += 2) {
            const v1 = this.array[i];
            const v2 = this.array[i + 1];
            if (
                v1 !== undefined &&
                v2 !== undefined &&
                (v1 !== 0 || v2 !== 0)
            ) {
                activeValues.push([v1, v2]);
            }
        }
        return activeValues[Symbol.iterator]();
    }

    entries(): IterableIterator<[number, [number, number]]> {
        const activeEntries: [number, [number, number]][] = [];
        for (let i = 0; i < this.array.length; i += 2) {
            const v1 = this.array[i];
            const v2 = this.array[i + 1];
            if (
                v1 !== undefined &&
                v2 !== undefined &&
                (v1 !== 0 || v2 !== 0)
            ) {
                activeEntries.push([i / 2, [v1, v2]]);
            }
        }
        return activeEntries[Symbol.iterator]();
    }

    [Symbol.iterator](): IterableIterator<[number, [number, number]]> {
        return this.entries();
    }

    private getLngLat(id: number): [number, number] | undefined {
        const offset = id * 2;
        if (offset >= this.array.length) return undefined;

        const lng = this.array[offset];
        const lat = this.array[offset + 1];

        if (lng === undefined || lat === undefined) return undefined;
        if (lng === 0 && lat === 0) return undefined;

        return [lng, lat];
    }
}
