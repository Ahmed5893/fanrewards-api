
// Implement AuthService
// - register: create user, return tokens
// - login: verify credentials, return tokens
// - refresh: validate refresh token, issue new token pair
// - logout: invalidate refresh token
import bcrypt from "bcrypt";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { DataSource } from "typeorm";
import { config } from "../config";
import { User } from "../entities/User";
import {
  TokenPair,
  RegisterInput,
  LoginInput,
  AuthResponse,
  AuthUserResponse,
} from "../types";

interface RefreshTokenPayload extends JwtPayload {
  userId: string;
}

export class AuthService{
  private readonly saltRounds =12;

  constructor(private readonly db : DataSource) {}

  //Register a User

  async register(input : RegisterInput): Promise<AuthResponse>{
  const userRepository = this.db.getRepository(User) ;
  const normalizedEmail = input.email.toLowerCase().trim();
  const existingUser = await userRepository.findOne({
    where:{email : normalizedEmail}
  });
  if(existingUser){
    throw new Error('EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password,this.saltRounds);
  const user = userRepository.create({
    email:normalizedEmail,
    passwordHash,
    displayName : input.displayName.trim(),
    totalPoints : 0,
  });
 
  const savedUser = await userRepository.save(user);
  const tokens = this.generateTokenPair(savedUser.id);
  savedUser.refreshTokenHash = await bcrypt.hash(
    tokens.refreshToken,
    this.saltRounds,
  );
  await userRepository.save(savedUser);

  return {

    user : this.toAuthUserResponse(savedUser),
    tokens,
  }

  }

  //User Log In

  async login(input :LoginInput) : Promise<AuthResponse>{

    const userRepository = this.db.getRepository(User);
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await userRepository.findOne({
        where : {email : normalizedEmail}
    });

    if(!user) {

    throw new Error('INVALID_CREDENTIALS');

    };

    const passwordMatches = await bcrypt.compare(
            input.password,
            user.passwordHash
        );
    if(!passwordMatches) {

         throw new Error('INVALID_CREDENTIALS');

        };

    const tokens = this.generateTokenPair(user.id);
    user.refreshTokenHash = await bcrypt.hash(
       
     tokens.refreshToken,
     this.saltRounds   
    );
    await userRepository.save(user);

    return {

    user : this.toAuthUserResponse(user),
    tokens,
};

  }

  async refresh(refreshToken : string) : Promise<TokenPair>{

    const userRepository = this.db.getRepository(User);
    let payload : RefreshTokenPayload;
    try {
        payload = jwt.verify(
            refreshToken,
            config.jwt.refreshSecret
        ) as RefreshTokenPayload
        
    } catch  {
    
        throw new Error('INVALID_REFRESH_TOKEN');
    }
    const user = await userRepository.findOne({
        where : {id : payload.userId}
    });
        if (!user || !user.refreshTokenHash) {

         throw new Error('INVALID_REFRESH_TOKEN');

        }
   const tokenMatches = await bcrypt.compare(
    refreshToken,
    user.refreshTokenHash,
   );
       if (!tokenMatches) {

          throw new Error('INVALID_REFRESH_TOKEN');
       }

    const tokens = this.generateTokenPair(user.id);
    user.refreshTokenHash = await bcrypt.hash(
        tokens.refreshToken,
        this.saltRounds
    );
     await userRepository.save(user);

     return tokens;

  }

  private generateTokenPair(userId : string): TokenPair {
    
    const accessOptions : SignOptions = {
        expiresIn : config.jwt.accessExpiresIn as SignOptions['expiresIn'],

    };

    const refreshOptions : SignOptions = {
        expiresIn : config.jwt.refreshExpiresIn as SignOptions['expiresIn']
    } ;
    
    const accessToken = jwt.sign(
        {userId},
        config.jwt.accessSecret,
        accessOptions
    );

    const refreshToken = jwt.sign(
        {userId},
        config.jwt.refreshSecret,
        refreshOptions
    );

    return {
        accessToken,
        refreshToken
    };

  }

  private toAuthUserResponse(user : User): AuthUserResponse {
   
    return {
        
        id : user.id,
        email : user.email,
        displayName : user.displayName,
        totalPoints : user.totalPoints,
        createdAt : user.createdAt.toISOString(),
        updatedAt : user.updatedAt.toISOString(),
    }

  }

}
