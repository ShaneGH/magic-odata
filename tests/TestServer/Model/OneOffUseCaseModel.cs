using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

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