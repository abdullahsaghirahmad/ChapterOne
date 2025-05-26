import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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
} 