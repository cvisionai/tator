class ProjectTypesData {
    constructor(projectId){
      this.projectId = projectId;
    }

    // Creates navigatable to get from type > entity > attributes
    _getAttributeDataByType(projectId = this.projectId){
      console.log("_getProjectTypesData: "+projectId);
      // Promise all.... then bundle them up
      let promises = this._getAllTypePromises(projectId);
      this.attributeDataByType = {};
  
      return Promise.all(promises)
      .then( async([mta, lo, le, st]) => {
        const mediaTypesData = mta.json();
        const localizationData = lo.json();
        const leafTypeData = le.json();
        const stateTypeData = st.json();
        Promise.all( [mediaTypesData, localizationData, leafTypeData, stateTypeData] )
          .then( ([mediaTypes, localization, leaf, state]) => {
            this.attributeDataByType.MediaType = {};
            this.attributeDataByType.LocalizationType = {};
            this.attributeDataByType.LeafType = {};
            this.attributeDataByType.StateType = {};
  
            for(let entity of mediaTypes){
                this.attributeDataByType.MediaType[entity.name] = entity.attribute_types;
            }
            for(let entity of localization){
                this.attributeDataByType.LocalizationType[entity.name] = entity.attribute_types;
            }
            for(let entity of leaf){
                this.attributeDataByType.LeafType[entity.name] = entity.attribute_types;
            }
            for(let entity of state){
                this.attributeDataByType.StateType[entity.name] = entity.attribute_types;
            }
          });
          return this.attributeDataByType;
        });
      }

      _getAllTypePromises(projectId = this.projectId){
        // Media Type section.
        this.mediaTypesBlock = document.createElement("media-type-main-edit");
        this.localizationBlock = document.createElement("localization-edit");
        this.leafTypesBlock = document.createElement("leaf-type-edit");
        this.stateTypesBlock = document.createElement("state-type-edit");
    
        const mediaTypesPromise = this.mediaTypesBlock._fetchGetPromise({"id": this.projectId} );
        const localizationsPromise = this.localizationBlock._fetchGetPromise({"id": this.projectId} );
        const leafTypesPromise = this.leafTypesBlock._fetchGetPromise({"id": this.projectId} );
        const stateTypesPromise = this.stateTypesBlock._fetchGetPromise({"id": this.projectId} );
    
        return [
          mediaTypesPromise,
          localizationsPromise,
          leafTypesPromise,
          stateTypesPromise
        ];
      }
}