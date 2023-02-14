using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Formatter;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Results;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;
using TestServer.Model;

namespace TestServer.Controllers;


[Route(Program.OdataRoot)]
public class CompositeKeyItemsController : ODataController
{
    private readonly EntityDbContext _inMemoryDb;

    public CompositeKeyItemsController(EntityDbContext inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("CompositeKeyItems(Id1={key1},Id2={key2})")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public SingleResult<CompositeKeyItem> GetUsersFromHasIds([FromRoute] string key1, Guid key2)
    {
        return SingleResult.Create(_inMemoryDb.CompositeKeyItems.Where(x => x.Id1 == key1 && x.Id2 == key2));
    }

    public ActionResult Post([FromBody] CompositeKeyItem item)
    {
        item.Id1 = Guid.NewGuid().ToString();
        item.Id2 = Guid.NewGuid();

        _inMemoryDb.CompositeKeyItems.Add(item);
        _inMemoryDb.SaveChanges();
        return Created(item);
    }
}

[Route(Program.OdataRoot)]
public class OneOfEverythingsController : ODataController
{
    private readonly EntityDbContext _inMemoryDb;

    public OneOfEverythingsController(EntityDbContext inMemoryDb)
    {
        this._inMemoryDb = inMemoryDb;
    }

    [HttpGet("OneOfEverythings")]
    [EnableQuery(MaxAnyAllExpressionDepth = 100, MaxExpansionDepth = 100)]
    public IQueryable<OneOfEverything> Get()
    {
        var es = _inMemoryDb.OneOfEverythings.AsQueryable();
        if (Request.Headers.ContainsKey("ToList"))
        {
            es = es.ToList().AsQueryable();
        }

        return es;
    }

    public ActionResult Post([FromBody] CompositeKeyItem item)
    {
        item.Id1 = Guid.NewGuid().ToString();
        item.Id2 = Guid.NewGuid();

        _inMemoryDb.CompositeKeyItems.Add(item);
        _inMemoryDb.SaveChanges();
        return Created(item);
    }
}