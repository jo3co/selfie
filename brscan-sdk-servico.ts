import { Step, SelfieType, SelfieErros } from './brscan-sdk-selfie-const';

const BRFLOW_SERVER = 'https://www.brflow.com.br';
const LIVENESS_SERVER = 'https://liveness.brscan.com.br';

//const BRFLOW_SERVER = 'https://dev-web-brflow.brscan.com.br';
//const LIVENESS_SERVER = 'http://10.97.74.170/v1';

export class Servico {
  private chave: string;
  private livenessKey: string = null;
  private livenessToken: string = null;

  constructor(chave: string) {
    this.chave = chave;
  }

  async validaChave() {
    return new Promise(async (resolve, reject) => {
      try {
        const formData = new FormData();
        formData.append('key', this.chave);
        formData.append('version', '2.0.0');
        formData.append('api_level', '1');
        formData.append('model', 'web');
        formData.append('os', 'web');
        let data = await fetch(
          BRFLOW_SERVER+'/ws/mobile/sdk-licenca',
          {
            method: 'POST',
            body: formData,
          }
        );
        let response = await data.json();
        if (response.type === 'error') {
          reject(
            {id: SelfieErros.FalhaAoConectarServidor, desc: 'Erro ao conectar no servidor, verifique sua conexão e tente novamente.'}
          );
        } else {
          if (typeof response.res === 'undefined') {
            reject(
              {id: SelfieErros.FalhaAoConectarServidor, desc: 'Erro ao conectar no servidor, verifique sua conexão e tente novamente.'}
            );
          } else {
            if (response.res.liveness_license && response.res.liveness_autentication) {
              this.livenessKey = response.res.liveness_license;
              let data = await fetch(
                LIVENESS_SERVER+'/v1/init/' + this.livenessKey,
                {
                  method: 'POST',
                  headers: new Headers({
                    "Authorization": `Basic ${response.res.liveness_autentication}`
                  }),
                }
              );
              try {
                let res = await data.json();
                this.livenessToken = res.token;
                resolve(SelfieType.Passive);
              } catch (ex) {
                resolve(SelfieType.Active);
              }
            } else {
              resolve(SelfieType.Active);
            }
          }
        }
      } catch (ex) {
        console.log('ex', ex);
        reject(
          {id: SelfieErros.FalhaAoConectarServidor, desc: 'Erro ao conectar no servidor, verifique sua conexão e tente novamente.'}
        );
      }
    });
  }

  async validaSelfies(selfies: Array<string>): Promise<any> {
    return new Promise(async (resolve, reject) => {

      let selfieA = selfies[0];
      let selfieB = selfies[1];

      try {

        var myHeaders = new Headers();
            myHeaders.append("Authorization", "Bearer "+this.livenessToken);

            var formdata = new FormData();
            formdata.append("file1", this.b64toBlob(selfieA), "download.jpeg");
            formdata.append("file2", this.b64toBlob(selfieB), "download.jpeg");
            formdata.append("source", "web");

            var requestOptions: RequestInit = {
              method: 'POST',
              headers: myHeaders,
              body: formdata
            };

            fetch(LIVENESS_SERVER + '/v1/check/' + this.livenessKey, requestOptions)
            .then(response => response.text())
            .then(responseText => {
              
              let response = JSON.parse(responseText);
                  if(typeof response.result !== 'undefined') {
                    if(response.result === 'real') {
                      resolve(
                        { selfieValida: true, selfie: selfieB }
                      );
                      return;
                    }
                  }
                  reject(
                    { selfieValida: false, desc: 'Erro ao capturar a selfie, tente novamente.' }
                  );

            })
            .catch(error => {
              reject(
                {id: SelfieErros.FalhaAoConectarServidor, desc: 'Erro ao conectar no servidor, verifique sua conexão e tente novamente.'}
              );
            });

        
      } catch (ex) {
        reject(
          {id: SelfieErros.FalhaAoConectarServidor, desc: 'Erro ao conectar no servidor, verifique sua conexão e tente novamente.'}
        );
      }
    });
  }


  private resizeImage = (
    imagem: string,
    maxWidth = 300,
    maxHeight = 300
  ): Promise<string> => {
    return new Promise(async function(resolve, reject) {
      var img = document.createElement('img');

      img.onload = () => {
        let MAX_WIDTH = maxWidth;
        let MAX_HEIGHT = maxHeight;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        var dataURI = canvas.toDataURL('image/jpeg', 0.75);

        resolve(dataURI);
      };

      img.src = imagem;
    });
  };

  private b64toBlob = (b64Data: string) => {

    var b64CodeData = b64Data.replace(/^[^,]+,/, '');
    const byteCharacters = atob(b64CodeData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: 'image/jpg'});

    return blob;
  };
}
