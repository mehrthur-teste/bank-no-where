import { v4 as uuidv4 } from 'uuid';  

export interface User {
    id: string;
    idCountry: string;
    country: string;
    name: string;
    fullName:string;
    password: string;
    token: string;
    email: [];
    accounts: Account[];
}

export interface Account {
    id: string;
    name: string;
    country:string;
    coordinates: Coordinates;
    email: string;
    token: string;
    amount: string;
}

export interface Coordinates {
    latitude: string;
    longitude: string;
}

export interface Ipay{
    id: string;
    bankThatIUsed: {};
    ipaydTo: {};
    amount: string;
    tokenUsed: string;
}

export interface IReceive{
    id: string;
    whoGaveMe: {};
    amount: string;
    tokenOfHim: string;
}

 export interface Tokens{
    tokesThatIReceived: IReceive[];
 }

