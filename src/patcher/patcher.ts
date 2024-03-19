type PatcherAfterCallback = (thisArg: any, args: IArguments, returnValue: any) => any;
type PatcherBeforeCallback = (thisArg: any, args: IArguments) => any;
type PatcherInsteadCallback = (thisArg: any, args: IArguments) => any;
type Patch = { callback: PatcherBeforeCallback, point: 'before' } |
    { callback: PatcherAfterCallback, point: 'after' } |
    { callback: PatcherInsteadCallback, point: 'instead' };

// this patcher implementation is based on the one used by BetterDiscord
export default class Patcher {
    patches: Map<object, Map<string, { original: any, patches: Patch[] }>> = new Map();
    unpatchers: Map<string, (() => void)[]> = new Map();

    applyPatches(object: object, property: string) {
        const properties = this.patches.get(object);
        if(!properties) return;

        const patches = properties.get(property);
        if(!patches) return;

        delete object[property];

        // reset the property to its original value
        object[property] = patches.original;

        // apply all patches
        for(const patch of patches.patches) {
            let original = object[property];
            switch(patch.point) {
                case 'before':
                    object[property] = function() {
                        patch.callback(this, arguments);
                        return original.apply(this, arguments);
                    }
                    break;
                case 'after':
                    object[property] = function() {
                        let returnValue = original.apply(this, arguments);
                        let newReturn = patch.callback(this, arguments, returnValue);

                        if(newReturn) return newReturn;
                        return returnValue;
                    }
                    break;
                case 'instead':
                    object[property] = function() {
                        return patch.callback(this, arguments);
                    }
                    break;
            }
        }
    }

    addPatch(object: object, property: string, patch: Patch) {
        if(!this.patches.has(object)) {
            this.patches.set(object, new Map([[property, { original: object[property], patches: [] }]]));
        }

        const properties = this.patches.get(object);
        if(!properties) return;

        if(!properties.has(property)) {
            properties.set(property, { original: object[property], patches: [] });
        }

        const patches = properties.get(property);
        if(!patches) return;

        patches.patches.push(patch);

        // apply patches to the object
        this.applyPatches(object, property);
    }

    getRemovePatch(id: string | null, object: object, property: string, patch: Patch) {
        let unpatch = () => {
            if(id) {
                // remove the patch from the id's list of unpatchers
                const unpatchers = this.unpatchers.get(id);
                if(unpatchers) {
                    const index = unpatchers.indexOf(unpatch);
                    if(index !== -1) {
                        unpatchers.splice(index, 1);
                    }
                }
            }

            // remove the patch from the patches map
            if(!this.patches.has(object)) return;
    
            const properties = this.patches.get(object);
            if(!properties) return;
    
            if(!properties.has(property)) return;
    
            const patches = properties.get(property);
            if(!patches) return;
    
            const index = patches.patches.indexOf(patch);
            if(index === -1) return;
    
            patches.patches.splice(index, 1);
    
            // apply patches to the object
            this.applyPatches(object, property);
    
            // if the list of patches is empty, remove the property from the map
            if(patches.patches.length === 0) {
                properties.delete(property);
            }
    
            // if the map of properties is empty, remove the object from the map
            if(properties.size === 0) {
                this.patches.delete(object);
            }
        }

        if(id) {
            if(!this.unpatchers.has(id)) {
                this.unpatchers.set(id, [unpatch]);
            } else {
                this.unpatchers.get(id)?.push(unpatch);
            }
        }

        return unpatch;
    }

    after(id: string | null, object: object, property: string, callback: PatcherAfterCallback) {
        let patch: Patch = { callback, point: 'after' };

        this.addPatch(object, property, patch);

        let remove = this.getRemovePatch(id, object, property, patch);

        return remove;
    }

    before(id: string | null, object: object, property: string, callback: PatcherBeforeCallback) {
        let patch: Patch = { callback, point: 'before' };

        this.addPatch(object, property, patch);

        let remove = this.getRemovePatch(id, object, property, patch);

        return remove;
    }

    instead(id: string | null, object: object, property: string, callback: PatcherInsteadCallback) {
        let patch: Patch = { callback, point: 'instead' };

        this.addPatch(object, property, patch);

        let remove = this.getRemovePatch(id, object, property, patch);

        return remove;
    }

    unpatchAll(id: string) {
        const unpatchers = this.unpatchers.get(id);
        if(!unpatchers) return;

        for(const unpatcher of unpatchers) {
            unpatcher();
        }
    }
}