class AnnotationPanelData extends HTMLElement {
    constructor(){
        super();
    }

    init(modelData) {
        this._modelData = modelData;
    }

    /*
    * Gets Media information for the localization
    * - Saves it back to it's annotationObject
    * - Would be cool if shows spinner then replaces it
    */
    async getMediaData(mediaId) {
        console.log("mediaId : "+mediaId);
        this.mediaInfo = await this._modelData.getMedia( mediaId );
        console.log(":::::::mediaInfo");
        console.log(this.mediaInfo);
        this.mediaTypeData = await this._modelData.getMediaType( this.mediaInfo.meta );
        console.log(":::::::mediaTypeData");
        console.log(this.mediaTypeData);

        const mediaData = {
            mediaInfo : this.mediaInfo,
            medaTypeData : this.mediaTypeData
        };

        return mediaData;
    }

}

customElements.define("annotation-panel-data", AnnotationPanelData);