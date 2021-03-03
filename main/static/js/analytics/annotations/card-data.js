class CardData {
    /* projectId : projectId, modelData : this._modelData */
    constructor({ 
        projectId = null,
        modelData = null, 
        localizationTypes = []
      }){
          this.projectId = projectId;
          this._modelData = modelData;
          this.localizationTypes = localizationTypes;
    }

    async makeCardList({ params = "", start = 0, stop = 20} = {}){
        this.cardList = {};
        this.cardList.cards = [];
        this.cardList.total = this._modelData.getLocalizationCount({params});

        this.localizations= await this._modelData.getLocalizations({
            params, 
            start, 
            stop
        });
        await this.getCardList(this.localizations, params);
        return this.cardList;
    }

    getCardList(localizations, params){
        return new Promise((resolve, reject) => {

            let counter = localizations.length;
            for(let l of localizations){
                let id = l.id;
                
                //let metaDetails = this.findMetaDetails( l.meta );
                let metaDetails = {name : "sample name", type : "sample type"};

                let mediaLink = document.createElement("a");
                mediaLink.setAttribute("href", `/${this.projectId}/annotation/${l.media}`)
                mediaLink.innerHTML = `Media ID ${l.media}`;
            
                let attributes = l.attributes;
                let created = new Date(l.created_datetime);
                let modified = new Date(l.modified_datetime);

                let promises = [ 
                        this._modelData.getUser(l.modified_by),
                        this._modelData.getLocalizationGraphic(l.id),
                        this._modelData.getLocalizationCount({params})
                    ]
                
                Promise.all(promises)
                .then((respArray) => {
                    let userName = respArray[0].username;
                    let graphic = respArray[1];
                    this.cardList.total = respArray[2];
            
                    let card = {
                        id,
                        metaDetails,
                        mediaLink,
                        graphic,
                        attributes,
                        created,
                        modified,
                        userName
                    };
                    //console.log(card);
                    this.cardList.cards.push(card);
                    counter --;
                    //console.log("counter went down is now: "+counter); 
                });
                
            }
            let counterCheckout = setInterval(function(){
                //console.log("interval check for counter "+counter); 
                if(counter == 0){
                    clearInterval(counterCheckout);
                    resolve("complete");
                }
                }, 500)
        });
    }

    findMetaDetails(id){
        for(let lt of this.localizationTypes){
            if(lt.id == id){
                return { name: lt.name, type: lt.dtype };
            }
        }
    }
}