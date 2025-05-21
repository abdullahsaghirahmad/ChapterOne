import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { Thread } from './Thread';

export type Pace = 'Fast' | 'Moderate' | 'Slow';

@Entity()
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column()
  author!: string;

  @Column({ nullable: true })
  isbn?: string;

  @Column({ nullable: true })
  publishedYear?: string;

  @Column({ nullable: true })
  coverImage?: string;

  @Column({ type: 'float', nullable: true })
  rating?: number;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['Fast', 'Moderate', 'Slow'],
    nullable: true
  })
  pace?: Pace;

  @Column('text', { array: true, nullable: true })
  tone?: string[];

  @Column('text', { array: true, nullable: true })
  themes?: string[];

  @Column('text', { array: true, nullable: true })
  bestFor?: string[];

  @Column('text', { array: true, nullable: true })
  categories?: string[];

  @Column({ nullable: true })
  pageCount?: number;

  @ManyToMany(() => Thread, thread => thread.books)
  threads!: Thread[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
  
  // Virtual property (not stored in database) to track external books
  isExternal?: boolean;
} 