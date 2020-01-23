/*
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    DOC ViewportJS
    -------------------
    Author              Colautti Lorenzo
    Last Update         15/01/2020
    Dependencies        nodejs, npm, typescript
    Git                 https://github.com/colauttilorenzo/hub.js/
    Version             1.0.0
    Licence             MIT Licence
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
      
    -- add new breakpoints
    Viewport.addBreakpoint('small', '(max-width: 500px)');
    Viewport.addBreakpoint('medium', '(max-width: 900px)');
    Viewport.addBreakpoint('large', '(max-width: 1200px)');
    Viewport.addBreakpoint('xlarge', '(min-width: 1200px)');

    -- attach delegate to the viewport
    Viewport.register(function() { console.log('default') });
    Viewport.register(function() { console.log('test 1') }, 'test1');
    Viewport.register(function() { console.log('test 2') }, 'test2');

    -- detach delegate from the vieport and remove breakpoint
    Viewport.detach('test1');
    Viewport.detach();
    Viewport.removeBreakpoint('medium');

    -- retrieve all breakpoints
    Viewport.getBreakpointList();

*/

class BreakpointInfo {
    public width: number;
    public sign: string;
    public breakpoint: string;

    public constructor(breakpoint: string, sign: string, width: number) {
        this.breakpoint = breakpoint;
        this.sign = sign;
        this.width = width;
    }

    public static getInfosByMediaQueryList(key: string, mediaquery: MediaQueryList): BreakpointInfo {
        const bpInfos = mediaquery.media.replace(/\(|width:|\(max-width:|px\)/gm, '').split('-');
        return new BreakpointInfo(key, bpInfos[0], (Number.parseFloat(bpInfos[1])));
    }
}

export class Breakpoint {

    public key: string;
    public mediaquery: MediaQueryList;
    public infos: BreakpointInfo;

    public constructor(key: string, mq: MediaQueryList) {
        this.key = key;
        this.mediaquery = mq;
        this.infos = BreakpointInfo.getInfosByMediaQueryList(key, mq);
    }

    public static getMediaQueryListEvent(mediaquery: string): MediaQueryList {
        const rgx = new RegExp(/\((min|max)-width:\s{0,}\d{0,}px\)/g);
        if (rgx.test(mediaquery) == false) {
            throw 'ERROR! mediaquery definition provided (' + mediaquery + ') is not a valid mediaquery';
        }

        return window.matchMedia(mediaquery);
    }

}

class BreakpointList {

    public list: Breakpoint[] = [];

    private _getIndexByKey(key: string): number {
        let index: number = -1;
        for (let i = 0; i < this.list.length; i++) {
            if (this.list[i].key == key) {
                index = i;
                break;
            }
        }

        return index;
    }

    public remove(key: string): void {
        const index: number = this._getIndexByKey(key);
        if (index > -1) {
            this.list.splice(index, 1);
        }
    }

    public get(key: string): Breakpoint | undefined {
        let index: number = this._getIndexByKey(key)
        if (index > -1) {
            return this.list[index];
        }

        return;
    }

    public getKeys(): string[] {
        if (this.list.length < 1) {
            return [];
        }

        const keys: string[] = [];
        for (let index in this.list) {
            keys.push(this.list[index].key);
        }

        return keys;
    }

    public exists(key: string): number {
        return this._getIndexByKey(key);
    }

    public getCurrent(): Breakpoint | undefined {
        if (this.list.length > 0) {
            for (const index in this.list) {
                if (this.list[index].mediaquery.matches) {
                    return this.list[index];
                }
            }
        }

        return;
    }
}

export abstract class Viewport {

    private static _breakpoints: BreakpointList = new BreakpointList();
    private static _hub: any = {};

    private static readonly _DEFAULT_NAME: string = '_';

    private constructor() {
        if (window.Viewport == undefined) {
            window.Viewport = Viewport;
        }
    }

    private static _listener(e: Event): void {
        const bp: Breakpoint | undefined = Viewport._breakpoints.getCurrent();
        if (bp != undefined) {
            Viewport._send(bp);
        }
    }

    private static _send(bp: Breakpoint): void {
        for (const name in Viewport._hub) {
            Viewport._hub[name](bp);
        }
    }

    public static breakpointExists(key: string): number {
        return Viewport._breakpoints.exists(key);
    }

    public static getBreakpointList(): Breakpoint[] {
        return Viewport._breakpoints.list;
    }

    public static removeBreakpoint(key: string): void {
        if (Viewport._breakpoints.exists(key) == -1) {
            throw 'ERROR! breakpoint ' + key + ' doesn\'t exists';
        }

        const bp: Breakpoint | undefined = Viewport._breakpoints.get(key);
        Viewport._breakpoints.remove(key);
    }

    public static addBreakpoint(key: string, mediaquery: string): void {
        if (typeof key != 'string') {
            throw 'ERROR! the key provided is not of type string';
        }

        if (key == undefined || key == '') {
            throw 'ERROR! the key provided is undefined or empty';
        }

        if (typeof mediaquery != 'string') {
            throw 'ERROR! the mediaquery provided is not of type string';
        }

        if (mediaquery == undefined || mediaquery == '') {
            throw 'ERROR! the mediaquery provided is undefined or empty';
        }

        if (Viewport._breakpoints.exists(key) > -1) {
            throw 'ERROR! the key provided is already exists into the breakpoint list';
        }

        try {

            mediaquery = mediaquery.toLowerCase();

            const mq: MediaQueryList = Breakpoint.getMediaQueryListEvent(mediaquery);
            mq.addListener(Viewport._listener);

            const bp: Breakpoint = new Breakpoint(key, mq);

            //TODO: fix casi di parità
            let index: number = -1;
            for (let i = 0; i < Viewport._breakpoints.list.length; i++) {
                const _bp = Viewport._breakpoints.list[i];
                if (_bp.infos.width > bp.infos.width && _bp.infos.sign == 'max') {
                    index = i;
                    break;
                }
            }

            if (index == -1) {
                Viewport._breakpoints.list.push(bp);
            } else {
                Viewport._breakpoints.list.splice(index, 0, bp);
            }

        } catch (ex) {
            throw 'ERROR! breakpoint is not added to the breakpoint list for some reason';
        }
    }

    public static register(handler: Function, name: string | undefined = undefined): void {
        if (name == undefined || (name != undefined && name.replace(/ /gm, '') == '')) {
            name = Viewport._DEFAULT_NAME;
        }

        if (Viewport._hub[name] == undefined) {
            Viewport._hub[name] = {}
        } else {
            throw 'ERROR! the name provided is already registered to the stack';
        }

        Viewport._hub[name] = handler;
    }

    public static detach(name: string | undefined = undefined): void {
        if (name == undefined || (name != undefined && name.replace(/ /gm, '') == '')) {
            Viewport._hub = {};
        } else {
            delete Viewport._hub[name];
        }
    }

    public static getHandlers(): any {
        return Viewport._hub;
    }

}

declare global {
    interface Window {
        Viewport: Viewport;
    }
}

window.Viewport = Viewport;