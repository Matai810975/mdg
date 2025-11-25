import { ApiProperty } from "@nestjs/swagger";

/**
 * String field operators for findMany queries
 */
export class StringFieldOperatorsDto {
  @ApiProperty({ required: false, description: "Exact match" })
  eq?: string;

  @ApiProperty({ required: false, description: "Contains substring" })
  contains?: string;

  @ApiProperty({ required: false, description: "Starts with substring" })
  startsWith?: string;

  @ApiProperty({ required: false, description: "Ends with substring" })
  endsWith?: string;

  @ApiProperty({ required: false, type: [String], description: "Match any of these values" })
  in?: string[];
}

/**
 * Number field operators for findMany queries
 */
export class NumberFieldOperatorsDto {
  @ApiProperty({ required: false, description: "Exact match" })
  eq?: number;

  @ApiProperty({ required: false, description: "Greater than or equal to" })
  gte?: number;

  @ApiProperty({ required: false, description: "Less than or equal to" })
  lte?: number;

  @ApiProperty({ required: false, description: "Greater than" })
  gt?: number;

  @ApiProperty({ required: false, description: "Less than" })
  lt?: number;

  @ApiProperty({ required: false, type: [Number], description: "Match any of these values" })
  in?: number[];
}

/**
 * Boolean field operators for findMany queries
 */
export class BooleanFieldOperatorsDto {
  @ApiProperty({ required: false, description: "Exact match" })
  eq?: boolean;

  @ApiProperty({ required: false, type: [Boolean], description: "Match any of these values" })
  in?: boolean[];
}

/**
 * Date field operators for findMany queries
 */
export class DateFieldOperatorsDto {
  @ApiProperty({ required: false, description: "Exact match" })
  eq?: Date;

  @ApiProperty({ required: false, description: "Greater than or equal to" })
  gte?: Date;

  @ApiProperty({ required: false, description: "Less than or equal to" })
  lte?: Date;

  @ApiProperty({ required: false, description: "Greater than" })
  gt?: Date;

  @ApiProperty({ required: false, description: "Less than" })
  lt?: Date;

  @ApiProperty({ required: false, type: [Date], description: "Match any of these values" })
  in?: Date[];
}

/**
 * Generic field operators for findMany queries
 * Used for enums and other types that don't have specific operators
 */
export class GenericFieldOperatorsDto {
  @ApiProperty({ required: false, description: "Exact match" })
  eq?: any;

  @ApiProperty({ required: false, description: "Match any of these values" })
  in?: any[];
}