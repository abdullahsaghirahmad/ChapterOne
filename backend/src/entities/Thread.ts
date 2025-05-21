import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { Book } from './Book';

@Entity()
export class Thread {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column({ default: 0 })
  upvotes!: number;

  @Column({ default: 0 })
  comments!: number;

  @Column('simple-array', { nullable: true })
  tags!: string[];

  @ManyToOne(() => User, user => user.threads)
  createdBy!: User;

  @ManyToMany(() => Book)
  @JoinTable()
  books!: Book[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
} 