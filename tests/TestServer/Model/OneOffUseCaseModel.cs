using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Microsoft.OData.Edm;

namespace TestServer.Model;

# nullable disable


[PrimaryKey("Id1", "Id2")]
public class CompositeKeyItem
{
    [Key]
    public string Id1 { get; set; }

    [Key]
    public Guid Id2 { get; set; }

    public string Data { get; set; }
}

public class OneOfEverything
{
    [Key]
    public string String { get; set; }

    public Guid Guid { get; set; }
    public Boolean Boolean { get; set; }

    [Column(TypeName = "date")]
    public DateTime Date { get; set; }
    public DateTimeOffset DateTimeOffset { get; set; }
    public TimeOfDay TimeOfDay { get; set; }
    public Int16 Int16 { get; set; }
    public Int32 Int32 { get; set; }
    public Int64 Int64 { get; set; }
    public Decimal Decimal { get; set; }
    public Double Double { get; set; }
    public Single Single { get; set; }
    public Byte Byte { get; set; }
    public byte[] Binary { get; set; }
    public TimeSpan Duration { get; set; }
    public SByte SByte { get; set; }
    // public GeographyPoint GeographyPoint { get; set; }
    // public GeographyLineString GeographyLineString { get; set; }
    // public GeographyPolygon GeographyPolygon { get; set; }
    // public GeographyMultiPoint GeographyMultiPoint { get; set; }
    // public GeographyMultiLineString GeographyMultiLineString { get; set; }
    // public GeographyMultiPolygon GeographyMultiPolygon { get; set; }
    // public GeographyCollection GeographyCollection { get; set; }
    // public GeometryPoint GeometryPoint { get; set; }
    // public GeometryLineString GeometryLineString { get; set; }
    // public GeometryPolygon GeometryPolygon { get; set; }
    // public GeometryMultiPoint GeometryMultiPoint { get; set; }
    // public GeometryMultiLineString GeometryMultiLineString { get; set; }
    // public GeometryMultiPolygon GeometryMultiPolygon { get; set; }
    // public GeometryCollection GeometryCollection { get; set; }
}