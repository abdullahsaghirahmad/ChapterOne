import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Thread } from './Thread';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @OneToMany(() => Thread, thread => thread.createdBy)
  threads!: Thread[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'simple-array', nullable: true })
  favoriteGenres?: string[];

  @Column({ nullable: true })
  preferredPace?: string;

  @Column({ type: 'simple-array', nullable: true })
  favoriteThemes?: string[];
} 