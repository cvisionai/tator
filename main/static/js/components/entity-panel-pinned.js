class EntityPanelPin {
    constructor({ storageKey, pinData }){
        this.storageKey = storageKey; // Should contain project ID
        this.pinData = pinData;
        this.initStorage();
    }

    pinEl(){

    }

    initStorage(){
        const currentStorage = JSON.parse( localStorage.getItem( this.storageKey ) );
        let id = this.pinData.id;

        currentStorage.id = pinData;

        const newStorage = JSON.stringify(currentStorage);

        localStorage.setItem(this.storageKey, newStorage);
    }
}