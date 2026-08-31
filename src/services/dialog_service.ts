import mitt from 'mitt';

const emitter = mitt();

export const dialogService = {
  openOptionDialog(options, title: string): Promise<any> {
    return new Promise((resolve) => {
      emitter.emit('open-option-dialog', { options, title, resolve });
    });
  }
};

export const dialogEmitter = emitter;
